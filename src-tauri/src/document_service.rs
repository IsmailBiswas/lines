use crate::error::{AppError, AppResult};
use crate::git_service;
use crate::types::{
    default_additional_html, default_cover_letter_html, default_resume_html, DocumentFile,
    MappedImport, Variant, Workspace,
};
use crate::types::{UserRecord, UserSummary};

pub fn documents_from_import(files: &[MappedImport]) -> AppResult<Vec<DocumentFile>> {
    let mut documents = Vec::new();
    let mut has_resume = false;

    for file in files {
        let content = std::fs::read_to_string(&file.path)?;
        match file.kind.as_str() {
            "resume" => {
                documents.push(DocumentFile {
                    key: "resume".into(),
                    name: "Resume".into(),
                    kind: "resume".into(),
                    content,
                });
                has_resume = true;
            }
            "cover-letter" => documents.push(DocumentFile {
                key: "cover-letter".into(),
                name: "Cover letter".into(),
                kind: "cover-letter".into(),
                content,
            }),
            "additional" => {
                let raw = file
                    .extra_name
                    .clone()
                    .or_else(|| {
                        std::path::Path::new(&file.path)
                            .file_stem()
                            .and_then(|stem| stem.to_str())
                            .map(|stem| stem.to_string())
                    })
                    .unwrap_or_else(|| "document".to_string());
                let name = git_service::sanitize_branch(&raw)?;
                documents.push(DocumentFile {
                    key: format!("documents/{name}"),
                    name,
                    kind: "additional".into(),
                    content,
                });
            }
            _ => return Err(AppError::msg("Unknown document kind.")),
        }
    }

    if !has_resume {
        documents.insert(0, resume_document(None));
    }
    Ok(documents)
}

pub fn resume_document(content: Option<String>) -> DocumentFile {
    DocumentFile {
        key: "resume".into(),
        name: "Resume".into(),
        kind: "resume".into(),
        content: content.unwrap_or_else(default_resume_html),
    }
}

pub fn cover_letter_document() -> DocumentFile {
    DocumentFile {
        key: "cover-letter".into(),
        name: "Cover letter".into(),
        kind: "cover-letter".into(),
        content: default_cover_letter_html(),
    }
}

pub fn additional_document(name: &str) -> AppResult<DocumentFile> {
    let name = git_service::sanitize_branch(name)?;
    Ok(DocumentFile {
        key: format!("documents/{name}"),
        name: name.clone(),
        kind: "additional".into(),
        content: default_additional_html(&name),
    })
}

pub fn workspace_from_user(
    users: Vec<UserSummary>,
    user: &UserRecord,
    preferred_variant: Option<&str>,
    preferred_version: Option<&str>,
    preferred_tab: Option<&str>,
) -> AppResult<Workspace> {
    let repo = git_service::open_repository(std::path::Path::new(&user.path))?;
    let branches = git_service::list_branches(&repo)?;
    let variants: Vec<Variant> = branches
        .iter()
        .map(|name| Variant { name: name.clone() })
        .collect();

    if variants.is_empty() {
        return Ok(Workspace {
            users,
            current_user: Some(UserSummary {
                id: user.id.clone(),
                name: user.name.clone(),
            }),
            variants,
            current_variant: None,
            versions: Vec::new(),
            current_version: None,
            documents: Vec::new(),
            current_tab: None,
            pdf_folder: user.pdf_folder.clone(),
            pdf_name_pattern: user.pdf_name_pattern.clone(),
        });
    }

    let current_variant = preferred_variant
        .map(|name| name.to_string())
        .filter(|name| variants.iter().any(|variant| variant.name == *name))
        .or_else(|| user.last_variant.clone().filter(|name| variants.iter().any(|variant| &variant.name == name)))
        .unwrap_or_else(|| variants[0].name.clone());

    git_service::checkout_branch(&repo, &current_variant)?;
    let versions = git_service::list_versions(&repo, &current_variant)?;
    let current_version = preferred_version
        .map(|id| id.to_string())
        .filter(|id| versions.iter().any(|version| version.id == *id))
        .or_else(|| user.last_version.clone().filter(|id| versions.iter().any(|version| &version.id == id)))
        .or_else(|| versions.first().map(|version| version.id.clone()));

    let documents = if let Some(version_id) = &current_version {
        git_service::read_documents(&repo, version_id)?
    } else {
        Vec::new()
    };

    let current_tab = preferred_tab
        .map(|tab| tab.to_string())
        .filter(|tab| documents.iter().any(|document| document.key == *tab))
        .or_else(|| user.last_tab.clone().filter(|tab| documents.iter().any(|document| document.key == *tab)))
        .or_else(|| documents.first().map(|document| document.key.clone()));

    Ok(Workspace {
        users,
        current_user: Some(UserSummary {
            id: user.id.clone(),
            name: user.name.clone(),
        }),
        variants,
        current_variant: Some(current_variant),
        versions,
        current_version,
        documents,
        current_tab,
        pdf_folder: user.pdf_folder.clone(),
        pdf_name_pattern: user.pdf_name_pattern.clone(),
    })
}
