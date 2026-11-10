use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

const CLOUD_APP_URL: &str = "https://fireupp.up.railway.app";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            .on_new_window(|url, _features| {
                println!("[Rust] New window requested: {}", url);
                tauri::webview::NewWindowResponse::Allow
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
                // Hide to tray on close
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running fireupp desktop application");
}
