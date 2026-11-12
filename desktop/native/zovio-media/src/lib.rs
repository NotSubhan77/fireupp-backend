#![deny(clippy::all)]

mod audio;
mod video;

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

use napi::bindgen_prelude::{Float32Array, Uint8Array};
use napi_derive::napi;

use audio::{start_wasapi_process_excluded_audio, AudioCaptureSession};
use video::{start_wgc_capture, VideoCaptureSession, VideoFrameSlot};

struct EngineState {
    running: AtomicBool,
    video_session: Mutex<Option<VideoCaptureSession>>,
    audio_session: Mutex<Option<AudioCaptureSession>>,
    frame_seq: Arc<AtomicU32>,
    latest_frame: Arc<Mutex<Option<VideoFrameSlot>>>,
    pcm_queue: Arc<Mutex<VecDeque<f32>>>,
    audio_frames_captured: Arc<AtomicU64>,
    audio_ok: AtomicBool,
}

impl EngineState {
    fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
            video_session: Mutex::new(None),
            audio_session: Mutex::new(None),
            frame_seq: Arc::new(AtomicU32::new(0)),
            latest_frame: Arc::new(Mutex::new(None)),
            pcm_queue: Arc::new(Mutex::new(VecDeque::with_capacity(48000))),
            audio_frames_captured: Arc::new(AtomicU64::new(0)),
            audio_ok: AtomicBool::new(false),
        }
    }
}

static ENGINE: OnceLock<EngineState> = OnceLock::new();

fn engine() -> &'static EngineState {
    ENGINE.get_or_init(EngineState::new)
}

#[napi(object)]
pub struct StartCaptureOptions {
    pub source_id: String,
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub fps: Option<u32>,
    pub share_audio: Option<bool>,
    pub exclude_pid: Option<u32>,
    pub show_cursor: Option<bool>,
}

#[napi(object)]
pub struct StartCaptureResult {
    pub ok: bool,
    pub audio_ok: bool,
    pub width: u32,
    pub height: u32,
    pub error: Option<String>,
    pub audio_error: Option<String>,
}

#[napi(object)]
pub struct PolledVideoFrame {
    pub seq: u32,
    pub width: u32,
    pub height: u32,
    pub data: Uint8Array,
}

#[napi(object)]
pub struct CaptureStats {
    pub running: bool,
    pub frames_captured: u32,
    pub audio_ok: bool,
    pub audio_frames: f64,
}

fn stop_internal() {
    let eng = engine();
    eng.running.store(false, Ordering::SeqCst);
    eng.audio_ok.store(false, Ordering::SeqCst);
    if let Ok(mut vs) = eng.video_session.lock() {
        if let Some(mut s) = vs.take() {
            s.stop();
        }
    }
    if let Ok(mut aus) = eng.audio_session.lock() {
        if let Some(mut s) = aus.take() {
            s.stop();
        }
    }
    if let Ok(mut lf) = eng.latest_frame.lock() {
        *lf = None;
    }
    if let Ok(mut pq) = eng.pcm_queue.lock() {
        pq.clear();
    }
}

#[napi]
pub fn is_native_supported() -> bool {
    cfg!(target_os = "windows")
}

#[napi]
pub fn start_capture(opts: StartCaptureOptions) -> StartCaptureResult {
    stop_internal();
    let eng = engine();
    eng.frame_seq.store(0, Ordering::SeqCst);
    eng.audio_frames_captured.store(0, Ordering::SeqCst);

    let max_w = opts.max_width.unwrap_or(1280).max(320);
    let max_h = opts.max_height.unwrap_or(720).max(180);
    let fps = opts.fps.unwrap_or(30).clamp(5, 60);
    let show_cursor = opts.show_cursor.unwrap_or(true);

    let (v_sess, width, height) = match start_wgc_capture(
        &opts.source_id,
        max_w,
        max_h,
        fps,
        show_cursor,
        eng.frame_seq.clone(),
        eng.latest_frame.clone(),
    ) {
        Ok(res) => res,
        Err(err) => {
            return StartCaptureResult {
                ok: false,
                audio_ok: false,
                width: 0,
                height: 0,
                error: Some(err),
                audio_error: None,
            };
        }
    };

    if let Ok(mut vs) = eng.video_session.lock() {
        *vs = Some(v_sess);
    }

    let mut audio_ok = false;
    let mut audio_error = None;
    if opts.share_audio.unwrap_or(false) {
        let exclude_pid = opts.exclude_pid.unwrap_or_else(std::process::id);
        match start_wasapi_process_excluded_audio(
            exclude_pid,
            eng.pcm_queue.clone(),
            eng.audio_frames_captured.clone(),
        ) {
            Ok(a_sess) => {
                if let Ok(mut aus) = eng.audio_session.lock() {
                    *aus = Some(a_sess);
                }
                audio_ok = true;
            }
            Err(e) => {
                audio_error = Some(e);
            }
        }
    }

    eng.audio_ok.store(audio_ok, Ordering::SeqCst);
    eng.running.store(true, Ordering::SeqCst);

    StartCaptureResult {
        ok: true,
        audio_ok,
        width,
        height,
        error: None,
        audio_error,
    }
}

#[napi]
pub fn stop_capture() -> bool {
    stop_internal();
    true
}

#[napi]
pub fn poll_video_frame(last_seq: Option<u32>) -> Option<PolledVideoFrame> {
    let eng = engine();
    if !eng.running.load(Ordering::Relaxed) {
        return None;
    }
    let current_seq = eng.frame_seq.load(Ordering::Acquire);
    if current_seq == 0 || last_seq == Some(current_seq) {
        return None;
    }
    let guard = eng.latest_frame.lock().ok()?;
    let slot = guard.as_ref()?;
    if last_seq == Some(slot.seq) {
        return None;
    }
    Some(PolledVideoFrame {
        seq: slot.seq,
        width: slot.width,
        height: slot.height,
        data: Uint8Array::with_data_copied(&slot.i420),
    })
}

#[napi]
pub fn poll_audio_pcm() -> Option<Float32Array> {
    let eng = engine();
    if !eng.running.load(Ordering::Relaxed) || !eng.audio_ok.load(Ordering::Relaxed) {
        return None;
    }
    let mut q = eng.pcm_queue.lock().ok()?;
    if q.is_empty() {
        return None;
    }
    let count = q.len().min(48000);
    let vec: Vec<f32> = q.drain(..count).collect();
    Some(Float32Array::new(vec))
}

#[napi]
pub fn get_capture_stats() -> CaptureStats {
    let eng = engine();
    CaptureStats {
        running: eng.running.load(Ordering::Relaxed),
        frames_captured: eng.frame_seq.load(Ordering::Relaxed),
        audio_ok: eng.audio_ok.load(Ordering::Relaxed),
        audio_frames: eng.audio_frames_captured.load(Ordering::Relaxed) as f64,
    }
}
