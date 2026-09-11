mod catalog;
mod commands;
mod document_service;
mod error;
mod git_service;
mod pdf_service;
mod types;
mod user_service;
mod write_service;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data = app.path().app_data_dir().expect("app data");
            std::fs::create_dir_all(data).ok();
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("close-requested", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            commands::create_user,
            commands::import_user_local,
            commands::import_user_remote,
            commands::switch_user,
            commands::export_user,
            commands::create_variant,
            commands::import_variant,
            commands::create_variant_from_version,
            commands::open_variant,
            commands::open_version,
            commands::save_documents,
            commands::delete_unsaved,
            commands::finish_version,
            commands::add_document,
            commands::remember_tab,
            commands::export_pdf,
            commands::set_remote,
            commands::sync_user,
            commands::open_host_page,
            commands::downloads_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Resume Tracker");
}
