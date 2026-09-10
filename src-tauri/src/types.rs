use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRecord {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub last_variant: Option<String>,
    #[serde(default)]
    pub last_version: Option<String>,
    #[serde(default)]
    pub last_tab: Option<String>,
    #[serde(default)]
    pub pdf_folder: Option<String>,
    #[serde(default)]
    pub pdf_name_pattern: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Catalog {
    pub current_user_id: Option<String>,
    pub users: Vec<UserRecord>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserSummary {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Variant {
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Version {
    pub id: String,
    pub message: String,
    pub timestamp: i64,
    pub is_unsaved: bool,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentFile {
    pub key: String,
    pub name: String,
    pub kind: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Workspace {
    pub users: Vec<UserSummary>,
    pub current_user: Option<UserSummary>,
    pub variants: Vec<Variant>,
    pub current_variant: Option<String>,
    pub versions: Vec<Version>,
    pub current_version: Option<String>,
    pub documents: Vec<DocumentFile>,
    pub current_tab: Option<String>,
    pub pdf_folder: Option<String>,
    pub pdf_name_pattern: Option<String>,
}

impl Workspace {
    pub fn empty(users: Vec<UserSummary>) -> Self {
        Self {
            users,
            current_user: None,
            variants: Vec::new(),
            current_variant: None,
            versions: Vec::new(),
            current_version: None,
            documents: Vec::new(),
            current_tab: None,
            pdf_folder: None,
            pdf_name_pattern: None,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct MappedImport {
    pub path: String,
    pub kind: String,
    pub extra_name: Option<String>,
}

pub const UNSAVED_MESSAGE: &str = "unsaved";
pub const RESUME_PATH: &str = "resume.html";
pub const COVER_LETTER_PATH: &str = "cover-letter.html";
pub const DOCUMENTS_DIR: &str = "documents";

pub fn default_resume_html() -> String {
    r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resume</title>
  <style>
    body { font-family: Georgia, serif; margin: 48px; color: #111; line-height: 1.5; }
    h1 { font-size: 28px; font-weight: 600; margin: 0 0 8px; }
    p { margin: 0 0 12px; }
  </style>
</head>
<body>
  <h1>Name</h1>
  <p>Write your resume here.</p>
</body>
</html>
"#
    .to_string()
}

pub fn default_cover_letter_html() -> String {
    r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cover letter</title>
  <style>
    body { font-family: Georgia, serif; margin: 48px; color: #111; line-height: 1.5; }
  </style>
</head>
<body>
  <p>Write your cover letter here.</p>
</body>
</html>
"#
    .to_string()
}

pub fn default_additional_html(name: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{name}</title>
  <style>
    body {{ font-family: Georgia, serif; margin: 48px; color: #111; line-height: 1.5; }}
  </style>
</head>
<body>
  <h1>{name}</h1>
  <p>Write this document here.</p>
</body>
</html>
"#
    )
}
