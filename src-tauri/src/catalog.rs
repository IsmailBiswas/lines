use std::fs;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};
use crate::types::{Catalog, UserRecord};

pub fn catalog_path(app_data: &Path) -> PathBuf {
    app_data.join("catalog.json")
}

pub fn users_root(app_data: &Path) -> PathBuf {
    app_data.join("users")
}

pub fn load_catalog(app_data: &Path) -> AppResult<Catalog> {
    let path = catalog_path(app_data);
    if !path.exists() {
        return Ok(Catalog::default());
    }
    let text = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&text)?)
}

pub fn save_catalog(app_data: &Path, catalog: &Catalog) -> AppResult<()> {
    fs::create_dir_all(app_data)?;
    fs::write(catalog_path(app_data), serde_json::to_string_pretty(catalog)?)?;
    Ok(())
}

pub fn find_user<'a>(catalog: &'a Catalog, id: &str) -> AppResult<&'a UserRecord> {
    catalog
        .users
        .iter()
        .find(|user| user.id == id)
        .ok_or_else(|| AppError::msg("That user is gone."))
}

pub fn find_user_mut<'a>(catalog: &'a mut Catalog, id: &str) -> AppResult<&'a mut UserRecord> {
    catalog
        .users
        .iter_mut()
        .find(|user| user.id == id)
        .ok_or_else(|| AppError::msg("That user is gone."))
}

pub fn known_by_path<'a>(catalog: &'a Catalog, path: &Path) -> Option<&'a UserRecord> {
    catalog.users.iter().find(|user| {
        Path::new(&user.path)
            .canonicalize()
            .ok()
            .and_then(|stored| path.canonicalize().ok().map(|asked| stored == asked))
            .unwrap_or(false)
    })
}
