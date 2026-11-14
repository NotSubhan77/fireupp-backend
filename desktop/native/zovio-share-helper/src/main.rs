#![windows_subsystem = "windows"]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use windows::ApplicationModel::Activation::{ActivationKind, ShareTargetActivatedEventArgs};
use windows::ApplicationModel::AppInstance;
use windows::ApplicationModel::DataTransfer::StandardDataFormats;
use windows::core::{HSTRING, Interface};
use windows::Storage::{IStorageFolder, NameCollisionOption, StorageFile, StorageFolder};
use windows::Win32::System::WinRT::{RO_INIT_MULTITHREADED, RoInitialize, RoUninitialize};

fn find_zovio_exe() -> Option<PathBuf> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidates = [
                dir.join("Zovio.exe"),
                dir.join("..").join("Zovio.exe"),
                dir.join("..").join("..").join("Zovio.exe"),
            ];
            for c in candidates {
                if c.is_file() {
                    return Some(c);
                }
            }
        }
    }
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let p = PathBuf::from(&local_app_data)
            .join("Programs")
            .join("zovio")
            .join("Zovio.exe");
        if p.is_file() {
            return Some(p);
        }
        let p2 = PathBuf::from(&local_app_data)
            .join("Programs")
            .join("Zovio")
            .join("Zovio.exe");
        if p2.is_file() {
            return Some(p2);
        }
    }
    if let Ok(pf) = std::env::var("ProgramFiles") {
        let p = PathBuf::from(pf).join("Zovio").join("Zovio.exe");
        if p.is_file() {
            return Some(p);
        }
    }
    None
}

fn ensure_share_temp_dir() -> PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let base = std::env::temp_dir().join("ZovioShare").join(format!("s-{}", stamp));
    let _ = fs::create_dir_all(&base);
    base
}

fn collect_share_payload() -> (Vec<PathBuf>, Vec<String>) {
    let mut files: Vec<PathBuf> = Vec::new();
    let mut text_parts: Vec<String> = Vec::new();

    let Ok(args) = AppInstance::GetActivatedEventArgs() else {
        return (files, text_parts);
    };
    let Ok(kind) = args.Kind() else {
        return (files, text_parts);
    };
    if kind != ActivationKind::ShareTarget {
        return (files, text_parts);
    }

    let Ok(share_args) = args.cast::<ShareTargetActivatedEventArgs>() else {
        return (files, text_parts);
    };
    let Ok(share_op) = share_args.ShareOperation() else {
        return (files, text_parts);
    };
    let Ok(data) = share_op.Data() else {
        let _ = share_op.ReportCompleted();
        return (files, text_parts);
    };

    if let Ok(fmt_files) = StandardDataFormats::StorageItems() {
        if data.Contains(&fmt_files).unwrap_or(false) {
            if let Ok(op) = data.GetStorageItemsAsync() {
                if let Ok(items) = op.get() {
                    let temp_dir = ensure_share_temp_dir();
                    let temp_hstr = HSTRING::from(temp_dir.to_string_lossy().as_ref());
                    let dest_folder = StorageFolder::GetFolderFromPathAsync(&temp_hstr)
                        .ok()
                        .and_then(|f| f.get().ok());

                    for item in items {
                        if let Ok(sfile) = item.cast::<StorageFile>() {
                            let existing_path = sfile.Path().map(|s| s.to_string_lossy()).unwrap_or_default();
                            if !existing_path.is_empty() && Path::new(&existing_path).is_file() {
                                files.push(PathBuf::from(existing_path));
                                continue;
                            }
                            if let Some(ref folder) = dest_folder {
                                let name = sfile.Name().unwrap_or_else(|_| HSTRING::from("shared_file"));
                                if let Ok(dest_if) = folder.cast::<IStorageFolder>() {
                                    if let Ok(copy_op) = sfile.CopyOverload(
                                        &dest_if,
                                        &name,
                                        NameCollisionOption::GenerateUniqueName,
                                    ) {
                                        if let Ok(copied) = copy_op.get() {
                                            if let Ok(cp) = copied.Path() {
                                                let cp_str = cp.to_string_lossy();
                                                if !cp_str.is_empty() {
                                                    files.push(PathBuf::from(cp_str));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if let Ok(fmt_link) = StandardDataFormats::WebLink() {
        if data.Contains(&fmt_link).unwrap_or(false) {
            if let Ok(op) = data.GetWebLinkAsync() {
                if let Ok(uri) = op.get() {
                    if let Ok(raw) = uri.AbsoluteUri() {
                        let s = raw.to_string_lossy().trim().to_string();
                        if !s.is_empty() {
                            text_parts.push(s);
                        }
                    }
                }
            }
        }
    }

    if let Ok(fmt_text) = StandardDataFormats::Text() {
        if data.Contains(&fmt_text).unwrap_or(false) {
            if let Ok(op) = data.GetTextAsync() {
                if let Ok(t) = op.get() {
                    let s = t.to_string_lossy().trim().to_string();
                    if !s.is_empty() && !text_parts.iter().any(|x| x == &s) {
                        text_parts.push(s);
                    }
                }
            }
        }
    }

    let _ = share_op.ReportCompleted();
    (files, text_parts)
}

fn main() {
    let mut need_uninit = false;
    unsafe {
        if RoInitialize(RO_INIT_MULTITHREADED).is_ok() {
            need_uninit = true;
        }
    }

    let (files, text_parts) = collect_share_payload();

    if need_uninit {
        unsafe { RoUninitialize(); }
    }

    if let Some(zovio_exe) = find_zovio_exe() {
        let mut cmd = Command::new(zovio_exe);
        for f in &files {
            cmd.arg("--share-file").arg(f);
        }
        let joined = text_parts.join("\n").trim().to_string();
        if !joined.is_empty() {
            cmd.arg("--share-text").arg(joined);
        }
        let _ = cmd.spawn();
    }
}
