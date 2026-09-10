use std::path::Path;

use crate::error::{AppError, AppResult};
use crate::git_service;
use crate::types::{DocumentFile, UNSAVED_MESSAGE};

pub fn save_documents(
    repo_path: &Path,
    branch: &str,
    selected_version: &str,
    documents: &[DocumentFile],
    author: &str,
) -> AppResult<String> {
    let repo = git_service::open_repository(repo_path)?;
    let current = git_service::read_documents(&repo, selected_version)?;
    if git_service::documents_match(&current, documents) {
        return Ok(selected_version.to_string());
    }

    let versions = git_service::list_versions(&repo, branch)?;
    let selected = versions
        .iter()
        .find(|version| version.id == selected_version)
        .ok_or_else(|| AppError::msg("That version is gone."))?;

    if selected.is_unsaved || selected.message.trim() == UNSAVED_MESSAGE {
        git_service::amend_unsaved(&repo, branch, documents, author)
    } else {
        git_service::create_unsaved(&repo, branch, selected_version, documents, author)
    }
}

pub fn finish_version(
    repo_path: &Path,
    branch: &str,
    selected_version: &str,
    documents: &[DocumentFile],
    author: &str,
    message: &str,
) -> AppResult<String> {
    let repo = git_service::open_repository(repo_path)?;
    git_service::create_named_version(
        &repo,
        branch,
        selected_version,
        documents,
        author,
        message,
    )
}
