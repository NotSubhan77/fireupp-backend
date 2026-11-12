use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use windows_capture::capture::{CaptureControl, Context, GraphicsCaptureApiHandler};
use windows_capture::frame::Frame;
use windows_capture::graphics_capture_api::InternalCaptureControl;
use windows_capture::monitor::Monitor;
use windows_capture::settings::{
    ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
    MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
};
use windows_capture::window::Window;

#[derive(Clone)]
pub struct VideoFrameSlot {
    pub seq: u32,
    pub width: u32,
    pub height: u32,
    pub i420: Vec<u8>,
}

pub struct VideoCaptureConfig {
    pub max_width: u32,
    pub max_height: u32,
    pub fps: u32,
    pub stop_flag: Arc<AtomicBool>,
    pub frame_seq: Arc<AtomicU32>,
    pub latest_frame: Arc<Mutex<Option<VideoFrameSlot>>>,
}

pub struct VideoCaptureSession {
    stop_flag: Arc<AtomicBool>,
    control: Option<CaptureControl<WgcHandler, Box<dyn std::error::Error + Send + Sync>>>,
}

impl VideoCaptureSession {
    pub fn stop(&mut self) {
        self.stop_flag.store(true, Ordering::SeqCst);
        if let Some(ctrl) = self.control.take() {
            let _ = ctrl.stop();
        }
    }
}

impl Drop for VideoCaptureSession {
    fn drop(&mut self) {
        self.stop();
    }
}

pub struct WgcHandler {
    max_width: u32,
    max_height: u32,
    min_frame_interval: Duration,
    last_emit: Instant,
    stop_flag: Arc<AtomicBool>,
    frame_seq: Arc<AtomicU32>,
    latest_frame: Arc<Mutex<Option<VideoFrameSlot>>>,
    scratch: Vec<u8>,
    cached_dims: (u32, u32, u32, u32),
    x_map: Vec<usize>,
    y_map: Vec<usize>,
}

impl GraphicsCaptureApiHandler for WgcHandler {
    type Flags = VideoCaptureConfig;
    type Error = Box<dyn std::error::Error + Send + Sync>;

    fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
        let flags = ctx.flags;
        let fps = flags.fps.clamp(5, 60);
        let interval = Duration::from_micros((1_000_000u64 / fps as u64).saturating_sub(1500));
        Ok(Self {
            max_width: flags.max_width.max(320),
            max_height: flags.max_height.max(180),
            min_frame_interval: interval,
            last_emit: Instant::now() - Duration::from_secs(1),
            stop_flag: flags.stop_flag,
            frame_seq: flags.frame_seq,
            latest_frame: flags.latest_frame,
            scratch: Vec::new(),
            cached_dims: (0, 0, 0, 0),
            x_map: Vec::new(),
            y_map: Vec::new(),
        })
    }

    fn on_frame_arrived(
        &mut self,
        frame: &mut Frame,
        capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        if self.stop_flag.load(Ordering::Relaxed) {
            capture_control.stop();
            return Ok(());
        }

        let now = Instant::now();
        if now.duration_since(self.last_emit) < self.min_frame_interval {
            return Ok(());
        }

        let mut buf = frame.buffer()?;
        let src_w = buf.width();
        let src_h = buf.height();
        if src_w < 2 || src_h < 2 {
            return Ok(());
        }

        let raw = buf.as_raw_buffer();
        let row_stride = raw.len() / (src_h as usize);
        if row_stride < (src_w as usize) * 4 {
            return Ok(());
        }

        let (out_w, out_h) = compute_even_target(src_w, src_h, self.max_width, self.max_height);
        self.ensure_maps(src_w, src_h, out_w, out_h);

        let y_len = (out_w as usize) * (out_h as usize);
        let uv_len = (out_w as usize / 2) * (out_h as usize / 2);
        let total_len = y_len + uv_len * 2;
        if self.scratch.len() != total_len {
            self.scratch.resize(total_len, 0);
        }

        bgra_to_i420_scaled(
            raw,
            row_stride,
            out_w as usize,
            out_h as usize,
            &self.x_map,
            &self.y_map,
            &mut self.scratch,
        );

        let next_seq = self.frame_seq.fetch_add(1, Ordering::SeqCst).wrapping_add(1);
        if let Ok(mut guard) = self.latest_frame.lock() {
            let mut reusable = guard.take().map(|mut old| {
                old.i420.clear();
                old.i420
            }).unwrap_or_else(|| Vec::with_capacity(total_len));
            reusable.resize(total_len, 0);
            reusable.copy_from_slice(&self.scratch);
            *guard = Some(VideoFrameSlot {
                seq: next_seq,
                width: out_w,
                height: out_h,
                i420: reusable,
            });
        }

        self.last_emit = now;
        Ok(())
    }

    fn on_closed(&mut self) -> Result<(), Self::Error> {
        self.stop_flag.store(true, Ordering::SeqCst);
        Ok(())
    }
}

impl WgcHandler {
    fn ensure_maps(&mut self, src_w: u32, src_h: u32, out_w: u32, out_h: u32) {
        let dims = (src_w, src_h, out_w, out_h);
        if self.cached_dims == dims {
            return;
        }
        self.x_map.clear();
        self.x_map.reserve(out_w as usize);
        for x in 0..out_w {
            let sx = ((x as u64 * src_w as u64) / out_w as u64).min((src_w - 1) as u64) as usize;
            self.x_map.push(sx * 4);
        }
        self.y_map.clear();
        self.y_map.reserve(out_h as usize);
        for y in 0..out_h {
            let sy = ((y as u64 * src_h as u64) / out_h as u64).min((src_h - 1) as u64) as usize;
            self.y_map.push(sy);
        }
        self.cached_dims = dims;
    }
}

fn compute_even_target(src_w: u32, src_h: u32, max_w: u32, max_h: u32) -> (u32, u32) {
    let scale_w = max_w as f64 / src_w as f64;
    let scale_h = max_h as f64 / src_h as f64;
    let scale = scale_w.min(scale_h).min(1.0);
    let w = ((src_w as f64 * scale).round() as u32 & !1).max(2);
    let h = ((src_h as f64 * scale).round() as u32 & !1).max(2);
    (w, h)
}

#[inline(always)]
fn clamp_u8(v: i32) -> u8 {
    v.clamp(0, 255) as u8
}

fn bgra_to_i420_scaled(
    src: &[u8],
    src_stride: usize,
    out_w: usize,
    out_h: usize,
    x_map: &[usize],
    y_map: &[usize],
    dst: &mut [u8],
) {
    let y_size = out_w * out_h;
    let half_w = out_w / 2;
    let uv_size = half_w * (out_h / 2);

    let (y_plane, uv_planes) = dst.split_at_mut(y_size);
    let (u_plane, v_plane) = uv_planes.split_at_mut(uv_size);

    for (y, &sy) in y_map.iter().enumerate() {
        let row_off = sy * src_stride;
        let dst_y_row = &mut y_plane[y * out_w..(y + 1) * out_w];
        let even_row = (y & 1) == 0;
        let uv_row_off = (y >> 1) * half_w;

        for (x, &sx_off) in x_map.iter().enumerate() {
            let p = row_off + sx_off;
            let b = src[p] as i32;
            let g = src[p + 1] as i32;
            let r = src[p + 2] as i32;

            let y_val = ((66 * r + 129 * g + 25 * b + 128) >> 8) + 16;
            dst_y_row[x] = clamp_u8(y_val);

            if even_row && (x & 1) == 0 {
                let u_val = ((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128;
                let v_val = ((112 * r - 94 * g - 18 * b + 128) >> 8) + 128;
                let uv_idx = uv_row_off + (x >> 1);
                u_plane[uv_idx] = clamp_u8(u_val);
                v_plane[uv_idx] = clamp_u8(v_val);
            }
        }
    }
}

pub fn start_wgc_capture(
    source_id: &str,
    max_width: u32,
    max_height: u32,
    fps: u32,
    show_cursor: bool,
    frame_seq: Arc<AtomicU32>,
    latest_frame: Arc<Mutex<Option<VideoFrameSlot>>>,
) -> Result<(VideoCaptureSession, u32, u32), String> {
    let stop_flag = Arc::new(AtomicBool::new(false));
    let cursor = if show_cursor {
        CursorCaptureSettings::WithCursor
    } else {
        CursorCaptureSettings::WithoutCursor
    };

    let cfg = VideoCaptureConfig {
        max_width,
        max_height,
        fps,
        stop_flag: stop_flag.clone(),
        frame_seq,
        latest_frame,
    };

    let min_interval = MinimumUpdateIntervalSettings::Custom(Duration::from_micros(
        (1_000_000u64 / fps.clamp(5, 60) as u64).saturating_sub(1000),
    ));

    let parts: Vec<&str> = source_id.split(':').collect();
    if parts.first() == Some(&"window") {
        if let Some(hwnd_str) = parts.get(1) {
            if let Ok(hwnd_val) = hwnd_str.parse::<usize>() {
                let win = Window::from_raw_hwnd(hwnd_val as *mut c_void);
                let rect = win.rect().ok();
                let (w, h) = rect
                    .map(|r| compute_even_target((r.right - r.left).max(2) as u32, (r.bottom - r.top).max(2) as u32, max_width, max_height))
                    .unwrap_or((max_width.min(1280), max_height.min(720)));

                let settings = Settings::new(
                    win,
                    cursor,
                    DrawBorderSettings::WithoutBorder,
                    SecondaryWindowSettings::Default,
                    min_interval,
                    DirtyRegionSettings::Default,
                    ColorFormat::Bgra8,
                    cfg,
                );
                let ctrl = WgcHandler::start_free_threaded(settings)
                    .map_err(|e| format!("WGC window capture start failed: {e}"))?;
                return Ok((
                    VideoCaptureSession {
                        stop_flag,
                        control: Some(ctrl),
                    },
                    w,
                    h,
                ));
            }
        }
    }

    let monitor = if parts.first() == Some(&"screen") {
        let idx = parts.get(1).and_then(|s| s.parse::<usize>().ok()).unwrap_or(0);
        let monitors = Monitor::enumerate().map_err(|e| format!("Monitor enumerate failed: {e}"))?;
        monitors
            .into_iter()
            .nth(idx)
            .or_else(|| Monitor::primary().ok())
            .ok_or_else(|| "No monitor found".to_string())?
    } else {
        Monitor::primary().map_err(|e| format!("Primary monitor failed: {e}"))?
    };

    let src_w = monitor.width().unwrap_or(max_width).max(2);
    let src_h = monitor.height().unwrap_or(max_height).max(2);
    let (w, h) = compute_even_target(src_w, src_h, max_width, max_height);

    let settings = Settings::new(
        monitor,
        cursor,
        DrawBorderSettings::WithoutBorder,
        SecondaryWindowSettings::Default,
        min_interval,
        DirtyRegionSettings::Default,
        ColorFormat::Bgra8,
        cfg,
    );
    let ctrl = WgcHandler::start_free_threaded(settings)
        .map_err(|e| format!("WGC screen capture start failed: {e}"))?;

    Ok((
        VideoCaptureSession {
            stop_flag,
            control: Some(ctrl),
        },
        w,
        h,
    ))
}
