use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

static SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

// Backend server runner
fn ensure_backend_server() {
    // Check if server is already running on port 3000
    if TcpStream::connect("127.0.0.1:3000").is_ok() {
        println!("[Rust] Backend server already running on port 3000");
        return;
    }

    println!("[Rust] Launching background server (server.js)...");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let spawned = if let Ok(child) = Command::new("node")
            .arg("server.js")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
        {
            if let Ok(mut lock) = SERVER_PROCESS.lock() {
                *lock = Some(child);
            }
            true
        } else if let Ok(child) = Command::new("node")
            .current_dir("..")
            .arg("server.js")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
        {
            if let Ok(mut lock) = SERVER_PROCESS.lock() {
                *lock = Some(child);
            }
            true
        } else {
            eprintln!("[Rust] Failed to launch server.js");
            false
        };

        if spawned {
            // Wait up to 5 seconds for server to bind port
            for _ in 0..50 {
                if TcpStream::connect("127.0.0.1:3000").is_ok() {
                    println!("[Rust] Backend server is ready on port 3000");
                    break;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(child) = Command::new("node").arg("server.js").spawn() {
            if let Ok(mut lock) = SERVER_PROCESS.lock() {
                *lock = Some(child);
            }
            for _ in 0..50 {
                if TcpStream::connect("127.0.0.1:3000").is_ok() {
                    println!("[Rust] Backend server is ready on port 3000");
                    break;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[Rust] Starting Fireupp application...");
    ensure_backend_server();

    println!("[Rust] Building Tauri application...");
    tauri::Builder::default()
        .setup(|app| {
            let win = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External("http://localhost:3000".parse().unwrap()),
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
            } else {
                println!("[Rust] Warning: default_window_icon() returned None");
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        println!("[Rust] Tray menu 'show' clicked");
                        for (_, window) in app.webview_windows() {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        println!("[Rust] Tray menu 'quit' clicked");
                        if let Ok(mut lock) = SERVER_PROCESS.lock() {
                            if let Some(mut child) = lock.take() {
                                let _ = child.kill();
                            }
                        }
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
                        println!("[Rust] Tray icon left-clicked");
                        let app = tray.app_handle();
                        for (_, window) in app.webview_windows() {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            println!("[Rust] Setup completed successfully!");
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
