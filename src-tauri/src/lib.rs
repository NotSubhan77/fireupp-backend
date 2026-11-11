use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

const CLOUD_APP_URL: &str = "https://fireupp.up.railway.app";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Enable Windows GPU Hardware Acceleration & zero-copy rendering
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist",
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            for (_, window) in app.webview_windows() {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let win = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External(CLOUD_APP_URL.parse().expect("valid cloud url")),
            )
            .title("Fireupp")
            .inner_size(1320.0, 860.0)
            .min_inner_size(960.0, 600.0)
            .center()
            .resizable(true)
            .decorations(false)
            .shadow(true)
            .initialization_script(r#"
                window.__IS_FIREUPP_DESKTOP__ = true;
                document.documentElement.classList.add('is-desktop-app');
                window.addEventListener('wheel', function(e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
                window.addEventListener('contextmenu', function(e) {
                    if (!e.target.closest('input, textarea, [contenteditable="true"]')) {
                        e.preventDefault();
                    }
                }, true);
                window.addEventListener('keydown', function(e) {
                    var k = e.key.toLowerCase();
                    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && ['r','p','u','s','g','f','=','+','-','0'].indexOf(k) !== -1)) {
                        e.preventDefault();
                    }
                }, true);
            "#)
            .on_navigation({
                let app_handle = app.handle().clone();
                move |url| {
                    if url.scheme() == "fireupp-action" {
                        if let Some(win) = app_handle.get_webview_window("main") {
                            match url.host_str() {
                                Some("minimize") => {
                                    let _ = win.minimize();
                                }
                                Some("toggle-maximize") => {
                                    if win.is_maximized().unwrap_or(false) {
                                        let _ = win.unmaximize();
                                    } else {
                                        let _ = win.maximize();
                                    }
                                }
                                Some("close") => {
                                    let _ = win.close();
                                }
                                Some("close-popups") => {
                                    for (label, popup) in app_handle.webview_windows() {
                                        if label.starts_with("auth-popup") {
                                            let _ = popup.destroy();
                                        }
                                    }
                                }
                                Some("start-dragging") => {
                                    let _ = win.start_dragging();
                                }
                                _ => {}
                            }
                        }
                        return false;
                    }
                    true
                }
            })
            .on_new_window({
                let app_handle = app.handle().clone();
                move |url, _features| {
                    let win_label = format!("auth-popup-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(1));
                    match tauri::WebviewWindowBuilder::new(
                        &app_handle,
                        win_label,
                        tauri::WebviewUrl::External(url),
                    )
                    .title("Sign In with Google — Fireupp")
                    .inner_size(520.0, 680.0)
                    .center()
                    .resizable(true)
                    .build()
                    {
                        Ok(popup_win) => tauri::webview::NewWindowResponse::Create { window: popup_win },
                        Err(_) => tauri::webview::NewWindowResponse::Allow,
                    }
                }
            })
            .build()?;

            let _ = win.show();
            let _ = win.set_focus();

            // Build native Windows tray menu
            let quit_i = MenuItem::with_id(app, "quit", "Quit Fireupp", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Fireupp", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Fireupp Communication App");

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        for (_, window) in app.webview_windows() {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        for (_, window) in app.webview_windows() {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            println!("[Rust] Window event on '{}': {:?}", window.label(), event);
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    // Hide main window to tray on close
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    // Instantly destroy auth popups and sub-windows when closed
                    let _ = window.destroy();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running fireupp desktop application");
}
