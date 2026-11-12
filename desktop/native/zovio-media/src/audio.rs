use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

use windows::core::{implement, AsImpl, IUnknown, Interface, HRESULT, PROPVARIANT};
use windows::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows::Win32::Media::Audio::{
    ActivateAudioInterfaceAsync, IActivateAudioInterfaceAsyncOperation,
    IActivateAudioInterfaceCompletionHandler, IActivateAudioInterfaceCompletionHandler_Impl,
    IAudioCaptureClient, IAudioClient, AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED,
    AUDCLNT_STREAMFLAGS_EVENTCALLBACK, AUDCLNT_STREAMFLAGS_LOOPBACK,
    AUDIOCLIENT_ACTIVATION_PARAMS, AUDIOCLIENT_ACTIVATION_PARAMS_0,
    AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK, AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS,
    PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE, VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
    WAVEFORMATEX,
};
use windows::Win32::Media::Multimedia::WAVE_FORMAT_IEEE_FLOAT;
use windows::Win32::System::Com::{CoInitializeEx, CoTaskMemAlloc, CoUninitialize, COINIT_MULTITHREADED};
use windows::Win32::System::Threading::{CreateEventW, SetEvent, WaitForSingleObject};
use windows::Win32::System::Variant::VT_BLOB;

const MAX_PCM_SAMPLES: usize = 48000 * 2; // Cap at 1s stereo to prevent latency build-up

pub struct AudioCaptureSession {
    stop_flag: Arc<AtomicBool>,
    join: Option<JoinHandle<()>>,
}

impl AudioCaptureSession {
    pub fn stop(&mut self) {
        self.stop_flag.store(true, Ordering::SeqCst);
        if let Some(j) = self.join.take() {
            let _ = j.join();
        }
    }
}

impl Drop for AudioCaptureSession {
    fn drop(&mut self) {
        self.stop();
    }
}

#[implement(IActivateAudioInterfaceCompletionHandler)]
struct ActivationHandler {
    event: HANDLE,
    result: Mutex<Option<Result<IAudioClient, String>>>,
}

impl IActivateAudioInterfaceCompletionHandler_Impl for ActivationHandler_Impl {
    fn ActivateCompleted(
        &self,
        activateoperation: Option<&IActivateAudioInterfaceAsyncOperation>,
    ) -> windows::core::Result<()> {
        let res = (|| -> Result<IAudioClient, String> {
            let op = activateoperation.ok_or_else(|| "Missing activation operation".to_string())?;
            let mut activate_hr = HRESULT(0);
            let mut unk: Option<IUnknown> = None;
            unsafe {
                op.GetActivateResult(&mut activate_hr, &mut unk)
                    .map_err(|e| format!("GetActivateResult failed: {e}"))?;
            }
            if activate_hr.is_err() {
                return Err(format!("ActivateAudioInterfaceAsync HRESULT: 0x{:08X}", activate_hr.0));
            }
            let unk = unk.ok_or_else(|| "No IUnknown returned from GetActivateResult".to_string())?;
            unk.cast::<IAudioClient>()
                .map_err(|e| format!("Cast to IAudioClient failed: {e}"))
        })();

        if let Ok(mut guard) = self.result.lock() {
            *guard = Some(res);
        }
        unsafe {
            let _ = SetEvent(self.event);
        }
        Ok(())
    }
}

pub fn start_wasapi_process_excluded_audio(
    exclude_pid: u32,
    pcm_queue: Arc<Mutex<VecDeque<f32>>>,
    audio_frames_counter: Arc<AtomicU64>,
) -> Result<AudioCaptureSession, String> {
    let stop_flag = Arc::new(AtomicBool::new(false));
    let (init_tx, init_rx) = std::sync::mpsc::channel::<Result<(), String>>();

    let thread_stop = stop_flag.clone();
    let join = thread::spawn(move || {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }

        let res = run_wasapi_loop(
            exclude_pid,
            thread_stop,
            pcm_queue,
            audio_frames_counter,
            init_tx.clone(),
        );

        if let Err(err) = res {
            let _ = init_tx.send(Err(err));
        }

        unsafe {
            CoUninitialize();
        }
    });

    match init_rx.recv_timeout(std::time::Duration::from_secs(4)) {
        Ok(Ok(())) => Ok(AudioCaptureSession {
            stop_flag,
            join: Some(join),
        }),
        Ok(Err(e)) => {
            stop_flag.store(true, Ordering::SeqCst);
            let _ = join.join();
            Err(e)
        }
        Err(_) => {
            stop_flag.store(true, Ordering::SeqCst);
            let _ = join.join();
            Err("WASAPI activation timed out".to_string())
        }
    }
}

fn run_wasapi_loop(
    exclude_pid: u32,
    stop_flag: Arc<AtomicBool>,
    pcm_queue: Arc<Mutex<VecDeque<f32>>>,
    audio_frames_counter: Arc<AtomicU64>,
    init_tx: std::sync::mpsc::Sender<Result<(), String>>,
) -> Result<(), String> {
    unsafe {
        let activate_event = CreateEventW(None, true, false, None)
            .map_err(|e| format!("CreateEventW(activate) failed: {e}"))?;

        let handler = ActivationHandler {
            event: activate_event,
            result: Mutex::new(None),
        };
        let handler_iface: IActivateAudioInterfaceCompletionHandler = handler.into();
        let handler_impl = handler_iface
            .as_impl();

        let activation_params = AUDIOCLIENT_ACTIVATION_PARAMS {
            ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
            Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 {
                ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
                    TargetProcessId: exclude_pid,
                    ProcessLoopbackMode: PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE,
                },
            },
        };

        let params_size = std::mem::size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>();
        let blob_mem = CoTaskMemAlloc(params_size).cast::<u8>();
        if blob_mem.is_null() {
            let _ = CloseHandle(activate_event);
            return Err("CoTaskMemAlloc failed for loopback activation params".to_string());
        }
        std::ptr::copy_nonoverlapping(
            (&activation_params as *const AUDIOCLIENT_ACTIVATION_PARAMS).cast::<u8>(),
            blob_mem,
            params_size,
        );

        let mut raw_prop: windows_core::imp::PROPVARIANT = std::mem::zeroed();
        raw_prop.Anonymous.Anonymous.vt = VT_BLOB.0;
        raw_prop.Anonymous.Anonymous.Anonymous.blob = windows_core::imp::BLOB {
            cbSize: params_size as u32,
            pBlobData: blob_mem,
        };
        let prop = PROPVARIANT::from_raw(raw_prop);

        let op = ActivateAudioInterfaceAsync(
            VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
            &IAudioClient::IID,
            Some(&prop),
            &handler_iface,
        )
        .map_err(|e| {
            let _ = CloseHandle(activate_event);
            format!("ActivateAudioInterfaceAsync failed: {e}")
        })?;

        let wait = WaitForSingleObject(activate_event, 3500);
        let _ = CloseHandle(activate_event);
        drop(op);

        if wait != WAIT_OBJECT_0 {
            return Err("Process loopback activation wait failed".to_string());
        }

        let client = handler_impl
            .result
            .lock()
            .ok()
            .and_then(|mut g| g.take())
            .ok_or_else(|| "Missing activation result".to_string())??;

        let wfx = WAVEFORMATEX {
            wFormatTag: WAVE_FORMAT_IEEE_FLOAT as u16,
            nChannels: 2,
            nSamplesPerSec: 48000,
            nAvgBytesPerSec: 48000 * 8,
            nBlockAlign: 8,
            wBitsPerSample: 32,
            cbSize: 0,
        };

        client
            .Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                200_000, // 20ms in 100ns units
                0,
                &wfx,
                None,
            )
            .map_err(|e| format!("IAudioClient::Initialize failed: {e}"))?;

        let sample_event = CreateEventW(None, false, false, None)
            .map_err(|e| format!("CreateEventW(sample) failed: {e}"))?;
        if let Err(e) = client.SetEventHandle(sample_event) {
            let _ = CloseHandle(sample_event);
            return Err(format!("SetEventHandle failed: {e}"));
        }

        let capture_client: IAudioCaptureClient = match client.GetService() {
            Ok(c) => c,
            Err(e) => {
                let _ = CloseHandle(sample_event);
                return Err(format!("GetService<IAudioCaptureClient> failed: {e}"));
            }
        };

        if let Err(e) = client.Start() {
            let _ = CloseHandle(sample_event);
            return Err(format!("IAudioClient::Start failed: {e}"));
        }

        let _ = init_tx.send(Ok(()));

        while !stop_flag.load(Ordering::Relaxed) {
            let _ = WaitForSingleObject(sample_event, 50);
            if stop_flag.load(Ordering::Relaxed) {
                break;
            }

            loop {
                let packet_frames = match capture_client.GetNextPacketSize() {
                    Ok(n) => n,
                    Err(_) => break,
                };
                if packet_frames == 0 {
                    break;
                }

                let mut data_ptr: *mut u8 = std::ptr::null_mut();
                let mut num_frames: u32 = 0;
                let mut flags: u32 = 0;
                if capture_client
                    .GetBuffer(&mut data_ptr, &mut num_frames, &mut flags, None, None)
                    .is_err()
                {
                    break;
                }

                if num_frames > 0 {
                    let sample_count = (num_frames as usize) * 2;
                    let is_silent = (flags & (AUDCLNT_BUFFERFLAGS_SILENT.0 as u32)) != 0 || data_ptr.is_null();

                    if let Ok(mut q) = pcm_queue.lock() {
                        let q_len = q.len();
                        if q_len + sample_count > MAX_PCM_SAMPLES {
                            let drop_count = (q_len + sample_count) - MAX_PCM_SAMPLES;
                            q.drain(..drop_count.min(q_len));
                        }
                        if is_silent {
                            q.extend(std::iter::repeat_n(0.0f32, sample_count));
                        } else {
                            let slice = std::slice::from_raw_parts(data_ptr.cast::<f32>(), sample_count);
                            q.extend(slice.iter().copied());
                        }
                    }
                    audio_frames_counter.fetch_add(num_frames as u64, Ordering::Relaxed);
                }

                let _ = capture_client.ReleaseBuffer(num_frames);
            }
        }

        let _ = client.Stop();
        let _ = CloseHandle(sample_event);
        Ok(())
    }
}
