use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::catalog;
use crate::document_service;
use crate::error::{AppError, AppResult};
use crate::git_service;
use crate::pdf_service;
use crate::types::{DocumentFile, MappedImport, PdfExportItem, Workspace};
use crate::user_service;
use crate::write_service;

fn app_data(app: &AppHandle) -> AppResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|_| AppError::msg("Could not open the app data folder."))
}

fn load_workspace_for_current(app: &AppHandle) -> AppResult<Workspace> {
    let data = app_data(app)?;
    let catalog = catalog::load_catalog(&data)?;
    let users = user_service::summaries(&catalog);
    let Some(id) = catalog.current_user_id.clone() else {
        return Ok(Workspace::empty(users));
    };
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(users, &user, None, None, None)
}

#[tauri::command]
pub fn bootstrap(app: AppHandle) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    if catalog.users.is_empty() {
        let (catalog, user) = user_service::create_user(&data, "Default")?;
        let users = user_service::summaries(&catalog);
        return document_service::workspace_from_user(users, &user, None, None, None);
    }
    load_workspace_for_current(&app)
}

#[tauri::command]
pub fn create_user(app: AppHandle, name: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let (catalog, user) = user_service::create_user(&data, &name)?;
    let users = user_service::summaries(&catalog);
    document_service::workspace_from_user(users, &user, None, None, None)
}

#[tauri::command]
pub fn import_user_local(app: AppHandle, name: String, path: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let (catalog, user) = user_service::import_local(&data, &name, PathBuf::from(path).as_path())?;
    let users = user_service::summaries(&catalog);
    document_service::workspace_from_user(users, &user, None, None, None)
}

#[tauri::command]
pub fn import_user_remote(app: AppHandle, name: String, url: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let (catalog, user) = user_service::import_remote(&data, &name, &url)?;
    let users = user_service::summaries(&catalog);
    document_service::workspace_from_user(users, &user, None, None, None)
}

#[tauri::command]
pub fn rename_user(app: AppHandle, id: String, name: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let (catalog, user) = user_service::rename_user(&data, &id, &name)?;
    let users = user_service::summaries(&catalog);
    if catalog.current_user_id.as_deref() == Some(user.id.as_str()) {
        return document_service::workspace_from_user(users, &user, None, None, None);
    }
    load_workspace_for_current(&app)
}

#[tauri::command]
pub fn switch_user(app: AppHandle, id: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let (catalog, user) = user_service::switch_user(&data, &id)?;
    let users = user_service::summaries(&catalog);
    document_service::workspace_from_user(users, &user, None, None, None)
}

#[tauri::command]
pub fn export_user(app: AppHandle, dest: String) -> AppResult<String> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .as_deref()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, id)?;
    let exported = user_service::export_user(
        PathBuf::from(&user.path).as_path(),
        PathBuf::from(dest).as_path(),
        &user.name,
    )?;
    Ok(exported.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn create_variant(app: AppHandle, name: String) -> AppResult<Workspace> {
    create_variant_with_files(&app, name, vec![document_service::resume_document(None)])
}

#[tauri::command]
pub fn import_variant(app: AppHandle, name: String, files: Vec<MappedImport>) -> AppResult<Workspace> {
    let documents = document_service::documents_from_import(&files)?;
    create_variant_with_files(&app, name, documents)
}

fn create_variant_with_files(
    app: &AppHandle,
    name: String,
    documents: Vec<DocumentFile>,
) -> AppResult<Workspace> {
    let data = app_data(app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let branch = git_service::sanitize_branch(&name)?;
    let repo = git_service::open_repository(PathBuf::from(&user.path).as_path())?;
    git_service::require_empty_repo(&repo)?;
    let version = git_service::create_orphan_branch(&repo, &branch, &documents, "Initial", &user.name)?;
    user_service::remember_place(&data, &id, Some(&branch), Some(&version), Some("resume"))?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&branch),
        Some(&version),
        Some("resume"),
    )
}

#[tauri::command]
pub fn create_variant_from_version(
    app: AppHandle,
    name: String,
    version_id: String,
) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let branch = git_service::sanitize_branch(&name)?;
    let repo = git_service::open_repository(PathBuf::from(&user.path).as_path())?;
    let version = git_service::create_branch_from_commit(&repo, &branch, &version_id, &user.name)?;
    user_service::remember_place(&data, &id, Some(&branch), Some(&version), Some("resume"))?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&branch),
        Some(&version),
        Some("resume"),
    )
}

#[tauri::command]
pub fn open_variant(app: AppHandle, name: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    user_service::remember_place(&data, &id, Some(&name), None, None)?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&name),
        None,
        None,
    )
}

#[tauri::command]
pub fn open_version(app: AppHandle, version_id: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let variant = user
        .last_variant
        .clone()
        .ok_or_else(|| AppError::msg("No variant is open."))?;
    user_service::remember_place(&data, &id, Some(&variant), Some(&version_id), None)?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&variant),
        Some(&version_id),
        None,
    )
}

#[tauri::command]
pub fn save_documents(
    app: AppHandle,
    variant: String,
    version_id: String,
    documents: Vec<DocumentFile>,
    tab: Option<String>,
) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let saved = write_service::save_documents(
        PathBuf::from(&user.path).as_path(),
        &variant,
        &version_id,
        &documents,
        &user.name,
    )?;
    let tab = tab.as_deref().unwrap_or("resume");
    user_service::remember_place(&data, &id, Some(&variant), Some(&saved), Some(tab))?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&variant),
        Some(&saved),
        Some(tab),
    )
}

#[tauri::command]
pub fn delete_unsaved(
    app: AppHandle,
    variant: String,
    version_id: String,
    tab: Option<String>,
) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let repo = git_service::open_repository(PathBuf::from(&user.path).as_path())?;
    let parent = git_service::delete_unsaved(&repo, &variant, &version_id)?;
    let tab = tab.as_deref().unwrap_or("resume");
    user_service::remember_place(&data, &id, Some(&variant), Some(&parent), Some(tab))?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&variant),
        Some(&parent),
        Some(tab),
    )
}

#[tauri::command]
pub fn finish_version(
    app: AppHandle,
    variant: String,
    version_id: String,
    documents: Vec<DocumentFile>,
    message: String,
    tab: Option<String>,
) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let saved = write_service::finish_version(
        PathBuf::from(&user.path).as_path(),
        &variant,
        &version_id,
        &documents,
        &user.name,
        &message,
    )?;
    let tab = tab.as_deref().unwrap_or("resume");
    user_service::remember_place(&data, &id, Some(&variant), Some(&saved), Some(tab))?;
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(
        user_service::summaries(&catalog),
        &user,
        Some(&variant),
        Some(&saved),
        Some(tab),
    )
}

#[tauri::command]
pub fn add_document(
    app: AppHandle,
    variant: String,
    version_id: String,
    documents: Vec<DocumentFile>,
    kind: String,
    name: Option<String>,
    tab: Option<String>,
) -> AppResult<Workspace> {
    let mut next = documents;
    let new_doc = match kind.as_str() {
        "cover-letter" => {
            if next.iter().any(|document| document.kind == "cover-letter") {
                return Err(AppError::msg("A cover letter is already there."));
            }
            document_service::cover_letter_document()
        }
        "additional" => {
            let raw = name.unwrap_or_else(|| "document".into());
            document_service::additional_document(&raw)?
        }
        _ => return Err(AppError::msg("Unknown document kind.")),
    };
    let new_key = new_doc.key.clone();
    next.push(new_doc);
    save_documents(app, variant, version_id, next, Some(tab.unwrap_or(new_key)))
}

#[tauri::command]
pub fn remember_tab(app: AppHandle, tab: String) -> AppResult<()> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .as_deref()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    user_service::remember_place(&data, id, None, None, Some(&tab))
}

#[tauri::command]
pub fn export_pdf(
    app: AppHandle,
    items: Vec<PdfExportItem>,
    dest_folder: String,
    resume_name: String,
) -> AppResult<String> {
    if items.is_empty() {
        return Err(AppError::msg("Select at least one file to export."));
    }
    let packet = pdf_service::export_htmls(&app, &items, PathBuf::from(&dest_folder).as_path(), &resume_name)?;
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    if let Some(id) = catalog.current_user_id {
        user_service::remember_pdf_defaults(&data, &id, Some(&dest_folder), Some(&resume_name))?;
    }
    Ok(packet)
}

#[tauri::command]
pub fn set_remote(app: AppHandle, url: String, token: String) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let repo = git_service::open_repository(PathBuf::from(&user.path).as_path())?;
    git_service::set_origin_url(&repo, &url)?;
    if !token.trim().is_empty() {
        user_service::remember_remote_token(&data, &id, &token)?;
    } else if user.remote_token.as_deref().map(str::trim).unwrap_or("").is_empty() {
        return Err(AppError::msg("Enter a token."));
    }
    let catalog = catalog::load_catalog(&data)?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    document_service::workspace_from_user(user_service::summaries(&catalog), &user, None, None, None)
}

#[tauri::command]
pub fn sync_user(app: AppHandle) -> AppResult<Workspace> {
    let data = app_data(&app)?;
    let catalog = catalog::load_catalog(&data)?;
    let id = catalog
        .current_user_id
        .clone()
        .ok_or_else(|| AppError::msg("No user is open."))?;
    let user = catalog::find_user(&catalog, &id)?.clone();
    let repo = git_service::open_repository(PathBuf::from(&user.path).as_path())?;
    git_service::sync_origin(&repo, user.remote_token.as_deref())?;
    document_service::workspace_from_user(user_service::summaries(&catalog), &user, None, None, None)
}

#[tauri::command]
pub fn open_host_page(kind: String) -> AppResult<()> {
    let url = match kind.as_str() {
        "github" => "https://github.com/new",
        "gitlab" => "https://gitlab.com/projects/new",
        _ => return Err(AppError::msg("Choose GitHub or GitLab.")),
    };
    open::that(url).map_err(|_| AppError::msg("The browser could not be opened."))
}

#[tauri::command]
pub fn downloads_dir(app: AppHandle) -> AppResult<String> {
    Ok(app
        .path()
        .download_dir()
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_else(|_| dirs_fallback()))
}

fn dirs_fallback() -> String {
    std::env::var("HOME")
        .map(|home| format!("{home}/Downloads"))
        .unwrap_or_else(|_| ".".into())
}
