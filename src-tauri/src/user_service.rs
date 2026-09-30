use std::path::{Path, PathBuf};

use uuid::Uuid;

use crate::catalog;
use crate::error::{AppError, AppResult};
use crate::git_service;
use crate::types::{Catalog, UserRecord, UserSummary};

pub fn summaries(catalog: &Catalog) -> Vec<UserSummary> {
    catalog
        .users
        .iter()
        .map(|user| UserSummary {
            id: user.id.clone(),
            name: user.name.clone(),
        })
        .collect()
}

pub fn create_user(app_data: &Path, name: &str) -> AppResult<(Catalog, UserRecord)> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::msg("Name cannot be empty."));
    }
    let mut catalog = catalog::load_catalog(app_data)?;
    let id = Uuid::new_v4().to_string();
    let path = catalog::users_root(app_data).join(&id);
    git_service::init_repository(&path)?;
    let user = UserRecord {
        id: id.clone(),
        name: name.to_string(),
        path: path.to_string_lossy().into_owned(),
        last_variant: None,
        last_version: None,
        last_tab: None,
        pdf_folder: None,
        pdf_name_pattern: None,
        remote_token: None,
    };
    catalog.users.push(user.clone());
    catalog.current_user_id = Some(id);
    catalog::save_catalog(app_data, &catalog)?;
    Ok((catalog, user))
}

pub fn import_local(app_data: &Path, name: &str, source: &Path) -> AppResult<(Catalog, UserRecord)> {
    let mut catalog = catalog::load_catalog(app_data)?;
    if let Some(existing_id) = catalog::known_by_path(&catalog, source).map(|user| user.id.clone()) {
        catalog.current_user_id = Some(existing_id.clone());
        let user = catalog::find_user(&catalog, &existing_id)?.clone();
        catalog::save_catalog(app_data, &catalog)?;
        return Ok((catalog, user));
    }
    git_service::open_repository(source)
        .map_err(|_| AppError::msg("That folder is not a Git repository."))?;
    let name = if name.trim().is_empty() {
        source
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("Imported")
            .to_string()
    } else {
        name.trim().to_string()
    };
    let id = Uuid::new_v4().to_string();
    let dest = catalog::users_root(app_data).join(&id);
    git_service::copy_repository(source, &dest)?;
    let user = UserRecord {
        id: id.clone(),
        name,
        path: dest.to_string_lossy().into_owned(),
        last_variant: None,
        last_version: None,
        last_tab: None,
        pdf_folder: None,
        pdf_name_pattern: None,
        remote_token: None,
    };
    catalog.users.push(user.clone());
    catalog.current_user_id = Some(id);
    catalog::save_catalog(app_data, &catalog)?;
    Ok((catalog, user))
}

pub fn import_remote(
    app_data: &Path,
    name: &str,
    url: &str,
    token: &str,
) -> AppResult<(Catalog, UserRecord)> {
    let mut catalog = catalog::load_catalog(app_data)?;
    let name = if name.trim().is_empty() {
        url.rsplit('/')
            .next()
            .unwrap_or("Remote")
            .trim_end_matches(".git")
            .to_string()
    } else {
        name.trim().to_string()
    };
    let token = token.trim();
    if token.is_empty() {
        return Err(AppError::msg("Enter a token."));
    }
    let id = Uuid::new_v4().to_string();
    let dest = catalog::users_root(app_data).join(&id);
    let repo = git_service::clone_repository(url, &dest, Some(token))?;
    let branch = git_service::current_branch(&repo)?.unwrap_or_else(|| {
        git_service::list_branches(&repo)
            .ok()
            .and_then(|names| names.into_iter().next())
            .unwrap_or_else(|| "Base".into())
    });
    let version = git_service::branch_tip_id(&repo, &branch).ok();
    let user = UserRecord {
        id: id.clone(),
        name,
        path: dest.to_string_lossy().into_owned(),
        last_variant: Some(branch),
        last_version: version,
        last_tab: Some("resume".into()),
        pdf_folder: None,
        pdf_name_pattern: None,
        remote_token: Some(token.to_string()),
    };
    catalog.users.push(user.clone());
    catalog.current_user_id = Some(id);
    catalog::save_catalog(app_data, &catalog)?;
    Ok((catalog, user))
}

pub fn rename_user(app_data: &Path, id: &str, name: &str) -> AppResult<(Catalog, UserRecord)> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::msg("Name cannot be empty."));
    }
    let mut catalog = catalog::load_catalog(app_data)?;
    let user = catalog::find_user_mut(&mut catalog, id)?;
    user.name = name.to_string();
    let user = user.clone();
    catalog::save_catalog(app_data, &catalog)?;
    Ok((catalog, user))
}

pub fn switch_user(app_data: &Path, id: &str) -> AppResult<(Catalog, UserRecord)> {
    let mut catalog = catalog::load_catalog(app_data)?;
    let user = catalog::find_user(&catalog, id)?.clone();
    catalog.current_user_id = Some(id.to_string());
    catalog::save_catalog(app_data, &catalog)?;
    Ok((catalog, user))
}

pub fn export_user(repo_path: &Path, dest: &Path, user_name: &str) -> AppResult<PathBuf> {
    let target = if dest.exists()
        && dest
            .read_dir()
            .map(|mut entries| entries.next().is_some())
            .unwrap_or(false)
    {
        dest.join(git_service::sanitize_branch(user_name)?)
    } else {
        dest.to_path_buf()
    };
    git_service::copy_repository(repo_path, &target)?;
    Ok(target)
}

pub fn remember_place(
    app_data: &Path,
    user_id: &str,
    variant: Option<&str>,
    version: Option<&str>,
    tab: Option<&str>,
) -> AppResult<()> {
    let mut catalog = catalog::load_catalog(app_data)?;
    let user = catalog::find_user_mut(&mut catalog, user_id)?;
    if let Some(variant) = variant {
        user.last_variant = Some(variant.to_string());
    }
    if let Some(version) = version {
        user.last_version = Some(version.to_string());
    }
    if let Some(tab) = tab {
        user.last_tab = Some(tab.to_string());
    }
    catalog::save_catalog(app_data, &catalog)
}

pub fn remember_pdf_defaults(
    app_data: &Path,
    user_id: &str,
    folder: Option<&str>,
    name_pattern: Option<&str>,
) -> AppResult<()> {
    let mut catalog = catalog::load_catalog(app_data)?;
    let user = catalog::find_user_mut(&mut catalog, user_id)?;
    if let Some(folder) = folder {
        user.pdf_folder = Some(folder.to_string());
    }
    if let Some(name_pattern) = name_pattern {
        user.pdf_name_pattern = Some(name_pattern.to_string());
    }
    catalog::save_catalog(app_data, &catalog)
}

pub fn remember_remote_token(app_data: &Path, user_id: &str, token: &str) -> AppResult<()> {
    let token = token.trim();
    if token.is_empty() {
        return Err(AppError::msg("Enter a token."));
    }
    let mut catalog = catalog::load_catalog(app_data)?;
    let user = catalog::find_user_mut(&mut catalog, user_id)?;
    user.remote_token = Some(token.to_string());
    catalog::save_catalog(app_data, &catalog)
}
