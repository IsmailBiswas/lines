use std::fs;
use std::path::{Path, PathBuf};

use git2::{
    BranchType, Commit, Cred, FetchOptions, ObjectType, Oid, PushOptions, RemoteCallbacks,
    Repository, Signature, TreeWalkMode, TreeWalkResult,
};

use crate::error::{AppError, AppResult};
use crate::types::{
    DocumentFile, Version, COVER_LETTER_PATH, DOCUMENTS_DIR, RESUME_PATH, UNSAVED_MESSAGE,
};

pub fn init_repository(path: &Path) -> AppResult<Repository> {
    fs::create_dir_all(path)?;
    Ok(Repository::init(path)?)
}

pub fn open_repository(path: &Path) -> AppResult<Repository> {
    Ok(Repository::open(path)?)
}

pub fn clone_repository(url: &str, path: &Path, token: Option<&str>) -> AppResult<Repository> {
    validate_https_remote_url(url)?;
    let token = token
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::msg("Enter a token."))?;
    if path.exists() {
        let _ = fs::remove_dir_all(path);
    }
    fs::create_dir_all(path)?;
    let mut fetch = FetchOptions::new();
    fetch.remote_callbacks(remote_callbacks(Some(token)));
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fetch);
    let repo = match builder.clone(url, path) {
        Ok(repo) => repo,
        Err(error) => {
            let _ = fs::remove_dir_all(path);
            return Err(map_push_error(error));
        }
    };
    prepare_remote_repository(&repo, Some(token))?;
    Ok(repo)
}

/// Fetch remote heads and this app's refs, then create any missing local branches.
pub fn prepare_remote_repository(repo: &Repository, token: Option<&str>) -> AppResult<()> {
    fetch_remote_refs(repo, token)?;
    ensure_local_branches_from_remotes(repo)
}

pub fn ensure_local_branches_from_remotes(repo: &Repository) -> AppResult<()> {
    let remotes = repo.branches(Some(BranchType::Remote))?;
    for (branch, _) in remotes.filter_map(Result::ok) {
        let Some(name) = branch.name()? else {
            continue;
        };
        let Some(short) = name.strip_prefix("origin/") else {
            continue;
        };
        if short == "HEAD" {
            continue;
        }
        if repo.find_branch(short, BranchType::Local).is_ok() {
            continue;
        }
        let commit = branch.get().peel_to_commit()?;
        repo.branch(short, &commit, false)?;
    }
    Ok(())
}

pub fn current_branch(repo: &Repository) -> AppResult<Option<String>> {
    let head = match repo.head() {
        Ok(head) => head,
        Err(_) => return Ok(None),
    };
    if !head.is_branch() {
        return Ok(None);
    }
    Ok(head.shorthand().map(|name| name.to_string()))
}

pub fn branch_tip_id(repo: &Repository, branch: &str) -> AppResult<String> {
    Ok(branch_tip(repo, branch)?.to_string())
}

pub fn copy_repository(source: &Path, dest: &Path) -> AppResult<()> {
    open_repository(source).map_err(|_| {
        AppError::msg("The open user is not a Git repository. Nothing was exported.")
    })?;
    if dest.exists() {
        let empty = dest
            .read_dir()
            .map(|mut entries| entries.next().is_none())
            .unwrap_or(false);
        if !empty {
            return Err(AppError::msg("That folder already has files."));
        }
    } else {
        fs::create_dir_all(dest)?;
    }
    copy_dir_including_git(source, dest)?;
    open_repository(dest).map_err(|_| {
        AppError::msg("The export did not produce a Git repository. Try a new empty folder.")
    })?;
    Ok(())
}

fn copy_dir_including_git(source: &Path, dest: &Path) -> AppResult<()> {
    fs::create_dir_all(dest)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if from.is_dir() {
            copy_dir_including_git(&from, &to)?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

pub fn require_empty_repo(repo: &Repository) -> AppResult<()> {
    if !list_branches(repo)?.is_empty() {
        return Err(AppError::msg(
            "This user already has work. Import HTML only when the user is empty.",
        ));
    }
    Ok(())
}

pub fn create_branch_from_commit(
    repo: &Repository,
    branch: &str,
    version_id: &str,
    author: &str,
) -> AppResult<String> {
    if repo.find_branch(branch, BranchType::Local).is_ok() {
        return Err(AppError::msg("A variant with that name already exists."));
    }
    let oid = git2::Oid::from_str(version_id)
        .map_err(|_| AppError::msg("That version could not be opened."))?;
    let commit = repo.find_commit(oid)?;
    if is_unsaved(&commit) {
        return Err(AppError::msg("Create a variant from a finished version."));
    }
    repo.branch(branch, &commit, false)?;
    // Exclusive boundary: the source version is not listed on the new variant.
    set_variant_root(repo, branch, commit.id())?;
    checkout_branch(repo, branch)?;
    let sig = signature(author)?;
    let tree = commit.tree()?;
    let draft = repo.commit(None, &sig, &sig, UNSAVED_MESSAGE, &tree, &[&commit])?;
    set_unsaved_ref(repo, branch, draft)?;
    move_branch_to(repo, branch, draft, None)?;
    Ok(draft.to_string())
}

pub fn list_branches(repo: &Repository) -> AppResult<Vec<String>> {
    let mut names = Vec::new();
    for branch in repo.branches(Some(BranchType::Local))? {
        let (branch, _) = branch?;
        if let Some(name) = branch.name()? {
            names.push(name.to_string());
        }
    }
    names.sort();
    Ok(names)
}

pub fn sanitize_branch(name: &str) -> AppResult<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::msg("Name cannot be empty."));
    }
    let mut out = String::new();
    for ch in trimmed.chars() {
        match ch {
            ' ' | '\t' => out.push('-'),
            c if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | '/') => out.push(c),
            _ => out.push('-'),
        }
    }
    let out = out
        .trim_matches(|c| c == '.' || c == '-' || c == '/')
        .to_string();
    if out.is_empty() || out.contains("..") || out.contains("@{") {
        return Err(AppError::msg("That name cannot be used."));
    }
    Ok(out)
}

pub fn create_orphan_branch(
    repo: &Repository,
    branch: &str,
    documents: &[DocumentFile],
    message: &str,
    author: &str,
) -> AppResult<String> {
    if repo.find_branch(branch, BranchType::Local).is_ok() {
        return Err(AppError::msg("A variant with that name already exists."));
    }
    write_working_files(repo, documents)?;
    let sig = signature(author)?;
    let tree_id = write_index_tree(repo)?;
    let tree = repo.find_tree(tree_id)?;
    let oid = repo.commit(
        Some(&format!("refs/heads/{branch}")),
        &sig,
        &sig,
        message,
        &tree,
        &[],
    )?;
    checkout_branch(repo, branch)?;
    Ok(oid.to_string())
}

pub fn checkout_branch(repo: &Repository, branch: &str) -> AppResult<()> {
    let spec = format!("refs/heads/{branch}");
    repo.set_head(&spec)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))?;
    Ok(())
}

pub fn list_versions(repo: &Repository, branch: &str) -> AppResult<Vec<Version>> {
    let mut versions = Vec::new();
    let Ok(branch_ref) = repo.find_branch(branch, BranchType::Local) else {
        return Ok(versions);
    };
    let root = variant_root(repo, branch)?;
    let mut seen = std::collections::HashSet::new();
    let tip = branch_ref.get().peel_to_commit()?.id();
    collect_line(repo, tip, root, &mut versions, &mut seen)?;
    for extra in extra_tips(repo, branch)? {
        collect_line(repo, extra, root, &mut versions, &mut seen)?;
    }

    if let Some(unsaved) = unsaved_commit(repo, branch)? {
        if seen.insert(unsaved.id()) {
            versions.push(version_from_commit(&unsaved));
        }
    }

    versions.sort_by(|left, right| {
        right
            .timestamp
            .cmp(&left.timestamp)
            .then_with(|| right.id.cmp(&left.id))
    });
    Ok(versions)
}

fn collect_line(
    repo: &Repository,
    start: git2::Oid,
    root: Option<git2::Oid>,
    versions: &mut Vec<Version>,
    seen: &mut std::collections::HashSet<git2::Oid>,
) -> AppResult<()> {
    let mut commit = repo.find_commit(start)?;
    loop {
        let oid = commit.id();
        if root == Some(oid) {
            // Exclusive boundary: the root commit is not listed on this variant.
            break;
        }
        if !seen.insert(oid) {
            break;
        }
        versions.push(version_from_commit(&commit));
        match commit.parent(0) {
            Ok(parent) => commit = parent,
            Err(_) => break,
        }
    }
    Ok(())
}

fn variant_root_name(branch: &str) -> String {
    format!("refs/rt/root/{branch}")
}

fn set_variant_root(repo: &Repository, branch: &str, oid: git2::Oid) -> AppResult<()> {
    repo.reference(&variant_root_name(branch), oid, true, "set variant root")?;
    Ok(())
}

fn variant_root(repo: &Repository, branch: &str) -> AppResult<Option<git2::Oid>> {
    match repo.find_reference(&variant_root_name(branch)) {
        Ok(reference) => Ok(Some(reference.peel_to_commit()?.id())),
        Err(_) => Ok(None),
    }
}

fn encode_branch_ref(branch: &str) -> String {
    branch.replace('/', "=")
}

fn extra_ref_name(branch: &str, oid: git2::Oid) -> String {
    format!("refs/rt/extra/{}/{}", encode_branch_ref(branch), oid)
}

fn remember_extra_tip(repo: &Repository, branch: &str, oid: git2::Oid) -> AppResult<()> {
    repo.reference(&extra_ref_name(branch, oid), oid, true, "keep variant version")?;
    Ok(())
}

fn extra_tips(repo: &Repository, branch: &str) -> AppResult<Vec<git2::Oid>> {
    let glob = format!("refs/rt/extra/{}/*", encode_branch_ref(branch));
    let mut oids = Vec::new();
    for reference in repo.references_glob(&glob)? {
        if let Some(oid) = reference?.target() {
            oids.push(oid);
        }
    }
    Ok(oids)
}

fn prune_extra_tips(repo: &Repository, branch: &str, tip: git2::Oid) -> AppResult<()> {
    for oid in extra_tips(repo, branch)? {
        let redundant = oid == tip || repo.graph_descendant_of(tip, oid).unwrap_or(false);
        if redundant {
            if let Ok(mut reference) = repo.find_reference(&extra_ref_name(branch, oid)) {
                reference.delete()?;
            }
        }
    }
    Ok(())
}

fn move_branch_to(
    repo: &Repository,
    branch: &str,
    new_oid: git2::Oid,
    displaced_tip: Option<git2::Oid>,
) -> AppResult<()> {
    if let Some(old) = displaced_tip {
        if old != new_oid {
            remember_extra_tip(repo, branch, old)?;
        }
    }
    repo.reference(
        &format!("refs/heads/{branch}"),
        new_oid,
        true,
        "move variant",
    )?;
    prune_extra_tips(repo, branch, new_oid)?;
    checkout_branch(repo, branch)?;
    Ok(())
}

pub fn read_documents(repo: &Repository, version_id: &str) -> AppResult<Vec<DocumentFile>> {
    let oid = git2::Oid::from_str(version_id)
        .map_err(|_| AppError::msg("That version could not be opened."))?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    let mut documents = Vec::new();

    if let Ok(blob) = blob_at(&repo, &tree, RESUME_PATH) {
        documents.push(DocumentFile {
            key: "resume".into(),
            name: "Resume".into(),
            kind: "resume".into(),
            content: blob,
        });
    }

    if let Ok(blob) = blob_at(&repo, &tree, COVER_LETTER_PATH) {
        documents.push(DocumentFile {
            key: "cover-letter".into(),
            name: "Cover Letter".into(),
            kind: "cover-letter".into(),
            content: blob,
        });
    }

    tree.walk(TreeWalkMode::PreOrder, |root, entry| {
        if root != format!("{DOCUMENTS_DIR}/") {
            return TreeWalkResult::Ok;
        }
        let Some(name) = entry.name() else {
            return TreeWalkResult::Ok;
        };
        if entry.kind() != Some(ObjectType::Blob) || !name.ends_with(".html") {
            return TreeWalkResult::Ok;
        }
        let path = format!("{DOCUMENTS_DIR}/{name}");
        if let Ok(blob) = blob_at(repo, &tree, &path) {
            let label = name.trim_end_matches(".html").to_string();
            documents.push(DocumentFile {
                key: format!("documents/{label}"),
                name: label,
                kind: "additional".into(),
                content: blob,
            });
        }
        TreeWalkResult::Ok
    })?;

    Ok(documents)
}

pub fn documents_match(left: &[DocumentFile], right: &[DocumentFile]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    let mut right_map: Vec<_> = right.iter().collect();
    right_map.sort_by(|a, b| a.key.cmp(&b.key));
    let mut left_sorted: Vec<_> = left.iter().collect();
    left_sorted.sort_by(|a, b| a.key.cmp(&b.key));
    left_sorted
        .iter()
        .zip(right_map)
        .all(|(a, b)| a.key == b.key && a.content == b.content)
}

pub fn create_unsaved(
    repo: &Repository,
    branch: &str,
    parent_id: &str,
    documents: &[DocumentFile],
    author: &str,
) -> AppResult<String> {
    write_working_files(repo, documents)?;
    let parent_oid = git2::Oid::from_str(parent_id)
        .map_err(|_| AppError::msg("That version could not be saved from."))?;
    let parent = repo.find_commit(parent_oid)?;
    if is_unsaved(&parent) {
        return amend_unsaved(repo, branch, documents, author);
    }
    let sig = signature(author)?;
    let tree_id = write_index_tree(repo)?;
    let tree = repo.find_tree(tree_id)?;
    let tip = branch_tip(repo, branch)?;
    let displaced = (tip != parent.id()).then_some(tip);
    let oid = repo.commit(None, &sig, &sig, UNSAVED_MESSAGE, &tree, &[&parent])?;
    set_unsaved_ref(repo, branch, oid)?;
    move_branch_to(repo, branch, oid, displaced)?;
    Ok(oid.to_string())
}

pub fn amend_unsaved(
    repo: &Repository,
    branch: &str,
    documents: &[DocumentFile],
    author: &str,
) -> AppResult<String> {
    amend_commit(repo, branch, documents, author, UNSAVED_MESSAGE)
}

pub fn create_named_version(
    repo: &Repository,
    branch: &str,
    parent_id: &str,
    documents: &[DocumentFile],
    author: &str,
    message: &str,
) -> AppResult<String> {
    let message = validate_version_name(message)?;
    let parent_oid = git2::Oid::from_str(parent_id)
        .map_err(|_| AppError::msg("That version could not be saved from."))?;
    let parent = repo.find_commit(parent_oid)?;
    if is_unsaved(&parent) {
        return amend_commit(repo, branch, documents, author, &message);
    }
    write_working_files(repo, documents)?;
    let sig = signature(author)?;
    let tree_id = write_index_tree(repo)?;
    let tree = repo.find_tree(tree_id)?;
    let tip = branch_tip(repo, branch)?;
    let displaced = (tip != parent.id()).then_some(tip);
    let oid = repo.commit(None, &sig, &sig, &message, &tree, &[&parent])?;
    delete_unsaved_ref(repo, branch)?;
    move_branch_to(repo, branch, oid, displaced)?;
    Ok(oid.to_string())
}

pub fn delete_unsaved(repo: &Repository, branch: &str, version_id: &str) -> AppResult<String> {
    let oid = git2::Oid::from_str(version_id)
        .map_err(|_| AppError::msg("That Unsaved version could not be deleted."))?;
    let commit = repo.find_commit(oid)?;
    if !is_unsaved(&commit) {
        return Err(AppError::msg("Only Unsaved versions can be deleted."));
    }
    let parent = commit
        .parent(0)
        .map_err(|_| AppError::msg("That Unsaved version has nothing to return to."))?;
    let root = variant_root(repo, branch)?;
    if root == Some(parent.id()) {
        return Err(AppError::msg("This Draft cannot be deleted."));
    }
    let tip = branch_tip(repo, branch)?;
    if tip == oid {
        repo.reference(
            &format!("refs/heads/{branch}"),
            parent.id(),
            true,
            "delete unsaved",
        )?;
        checkout_branch(repo, branch)?;
    }
    if let Ok(Some(current)) = unsaved_commit(repo, branch) {
        if current.id() == oid {
            delete_unsaved_ref(repo, branch)?;
        }
    }
    if let Ok(mut reference) = repo.find_reference(&extra_ref_name(branch, oid)) {
        reference.delete()?;
    }
    Ok(parent.id().to_string())
}

fn validate_version_name(message: &str) -> AppResult<String> {
    let message = message.trim();
    if message.is_empty() {
        return Err(AppError::msg("Name cannot be empty."));
    }
    if message.eq_ignore_ascii_case(UNSAVED_MESSAGE) {
        return Err(AppError::msg("Choose a name other than Unsaved."));
    }
    Ok(message.to_string())
}

fn amend_commit(
    repo: &Repository,
    branch: &str,
    documents: &[DocumentFile],
    author: &str,
    message: &str,
) -> AppResult<String> {
    let current = unsaved_commit(repo, branch)?
        .ok_or_else(|| AppError::msg("There is no Unsaved version to keep editing."))?;
    if !is_unsaved(&current) {
        return Err(AppError::msg("Only Unsaved versions can be amended."));
    }
    write_working_files(repo, documents)?;
    let sig = signature(author)?;
    let tree_id = write_index_tree(repo)?;
    let tree = repo.find_tree(tree_id)?;
    let tip = branch_tip(repo, branch)?;
    let displaced = (tip != current.id()).then_some(tip);
    let oid = current.amend(None, Some(&sig), Some(&sig), None, Some(message), Some(&tree))?;
    if message.trim() == UNSAVED_MESSAGE {
        set_unsaved_ref(repo, branch, oid)?;
    } else {
        delete_unsaved_ref(repo, branch)?;
    }
    move_branch_to(repo, branch, oid, displaced)?;
    Ok(oid.to_string())
}

fn write_working_files(repo: &Repository, documents: &[DocumentFile]) -> AppResult<()> {
    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::msg("This repository has no working folder."))?;

    let cover = workdir.join(COVER_LETTER_PATH);
    if !documents.iter().any(|doc| doc.key == "cover-letter") && cover.exists() {
        fs::remove_file(cover)?;
    }

    let docs_dir = workdir.join(DOCUMENTS_DIR);
    if docs_dir.exists() {
        for entry in fs::read_dir(&docs_dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.ends_with(".html") {
                continue;
            }
            let key = format!("documents/{}", name.trim_end_matches(".html"));
            if !documents.iter().any(|doc| doc.key == key) {
                fs::remove_file(entry.path())?;
            }
        }
    }

    for document in documents {
        let relative = path_for_key(&document.key)?;
        let full = workdir.join(&relative);
        if let Some(parent) = full.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(full, &document.content)?;
    }
    Ok(())
}

fn write_index_tree(repo: &Repository) -> AppResult<git2::Oid> {
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    Ok(index.write_tree()?)
}

fn path_for_key(key: &str) -> AppResult<PathBuf> {
    match key {
        "resume" => Ok(PathBuf::from(RESUME_PATH)),
        "cover-letter" => Ok(PathBuf::from(COVER_LETTER_PATH)),
        other if other.starts_with("documents/") => {
            let name = other.trim_start_matches("documents/");
            let safe = sanitize_branch(name)?;
            Ok(PathBuf::from(DOCUMENTS_DIR).join(format!("{safe}.html")))
        }
        _ => Err(AppError::msg("Unknown document.")),
    }
}

fn blob_at(repo: &Repository, tree: &git2::Tree, path: &str) -> AppResult<String> {
    let entry = tree.get_path(Path::new(path))?;
    let object = entry.to_object(repo)?;
    let blob = object.peel_to_blob()?;
    Ok(String::from_utf8_lossy(blob.content()).into_owned())
}

fn version_from_commit(commit: &Commit) -> Version {
    Version {
        id: commit.id().to_string(),
        message: commit
            .message()
            .unwrap_or("")
            .lines()
            .next()
            .unwrap_or("")
            .to_string(),
        timestamp: commit.time().seconds(),
        is_unsaved: is_unsaved(commit),
        parent_id: commit.parent_ids().next().map(|oid| oid.to_string()),
    }
}

fn is_unsaved(commit: &Commit) -> bool {
    commit
        .message()
        .map(|message| message.trim() == UNSAVED_MESSAGE)
        .unwrap_or(false)
}

fn signature(name: &str) -> AppResult<Signature<'static>> {
    let safe = if name.trim().is_empty() {
        "Resume Tracker"
    } else {
        name.trim()
    };
    Ok(Signature::now(safe, "resume-tracker@local")?)
}

fn branch_tip(repo: &Repository, branch: &str) -> AppResult<git2::Oid> {
    Ok(repo
        .find_branch(branch, BranchType::Local)?
        .get()
        .peel_to_commit()?
        .id())
}

fn unsaved_ref_name(branch: &str) -> String {
    format!("refs/rt/unsaved/{branch}")
}

fn set_unsaved_ref(repo: &Repository, branch: &str, oid: git2::Oid) -> AppResult<()> {
    repo.reference(&unsaved_ref_name(branch), oid, true, "update unsaved")?;
    Ok(())
}

fn delete_unsaved_ref(repo: &Repository, branch: &str) -> AppResult<()> {
    if let Ok(mut reference) = repo.find_reference(&unsaved_ref_name(branch)) {
        reference.delete()?;
    }
    Ok(())
}

fn unsaved_commit<'repo>(repo: &'repo Repository, branch: &str) -> AppResult<Option<Commit<'repo>>> {
    match repo.find_reference(&unsaved_ref_name(branch)) {
        Ok(reference) => Ok(Some(reference.peel_to_commit()?)),
        Err(_) => {
            let tip = repo
                .find_branch(branch, BranchType::Local)?
                .get()
                .peel_to_commit()?;
            if is_unsaved(&tip) {
                Ok(Some(tip))
            } else {
                Ok(None)
            }
        }
    }
}

pub fn origin_url(repo: &Repository) -> Option<String> {
    repo.find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|url| url.to_string()))
        .filter(|url| !url.is_empty())
}

pub fn set_origin_url(repo: &Repository, url: &str) -> AppResult<()> {
    validate_https_remote_url(url)?;
    if repo.find_remote("origin").is_ok() {
        repo.remote_set_url("origin", url)?;
    } else {
        repo.remote("origin", url)?;
    }
    Ok(())
}

fn validate_https_remote_url(url: &str) -> AppResult<()> {
    let url = url.trim();
    if url.is_empty() {
        return Err(AppError::msg("Enter a remote address."));
    }
    if url.contains('\n') || url.contains('\r') || url.contains(' ') {
        return Err(AppError::msg("That remote address is not valid."));
    }
    if url.starts_with("git@") || url.starts_with("ssh://") {
        return Err(AppError::msg(
            "Use an HTTPS repository URL. Sync uses the token, not SSH.",
        ));
    }
    Ok(())
}

pub fn sync_origin(repo: &Repository, token: Option<&str>) -> AppResult<()> {
    pull_origin(repo, token)?;
    push_origin(repo, token)?;
    Ok(())
}

fn remote_callbacks(token: Option<&str>) -> RemoteCallbacks<'static> {
    let token = token
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |url, username, allowed| {
        if let Some(token) = &token {
            let user = token_username(url);
            if allowed.contains(git2::CredentialType::USERNAME) {
                return Cred::username(user);
            }
            if allowed.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
                return Cred::userpass_plaintext(user, token);
            }
        }
        if allowed.contains(git2::CredentialType::SSH_KEY) {
            return Cred::ssh_key_from_agent(username.unwrap_or("git"));
        }
        if allowed.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
            let cfg = git2::Config::open_default()?;
            return Cred::credential_helper(&cfg, url, username);
        }
        Cred::default()
    });
    callbacks
}

fn token_username(url: &str) -> &'static str {
    if url.to_ascii_lowercase().contains("gitlab") {
        "oauth2"
    } else {
        "x-access-token"
    }
}

pub fn pull_origin(repo: &Repository, token: Option<&str>) -> AppResult<()> {
    fetch_remote_refs(repo, token)?;
    ensure_local_branches_from_remotes(repo)?;
    let remotes = repo.branches(Some(BranchType::Remote))?;
    for (branch, _) in remotes.filter_map(Result::ok) {
        let Some(name) = branch.name()? else {
            continue;
        };
        let Some(short) = name.strip_prefix("origin/") else {
            continue;
        };
        if short == "HEAD" {
            continue;
        }
        let oid = branch.get().peel_to_commit()?.id();
        fast_forward_branch(repo, short, oid)?;
    }
    Ok(())
}

fn fetch_remote_refs(repo: &Repository, token: Option<&str>) -> AppResult<()> {
    let mut remote = repo.find_remote("origin").map_err(|_| {
        AppError::msg("This user has no remote yet. Add one in Settings.")
    })?;
    let mut fetch = FetchOptions::new();
    fetch.remote_callbacks(remote_callbacks(token));
    match remote.fetch(
        &["refs/heads/*:refs/remotes/origin/*"],
        Some(&mut fetch),
        None,
    ) {
        Ok(()) => {}
        Err(error) if is_empty_remote(&error) => {}
        Err(error) => return Err(map_push_error(error)),
    }
    let mut fetch_rt = FetchOptions::new();
    fetch_rt.remote_callbacks(remote_callbacks(token));
    match remote.fetch(&["refs/rt/*:refs/rt/*"], Some(&mut fetch_rt), None) {
        Ok(()) => {}
        Err(error) if is_empty_remote(&error) || is_missing_refspec(&error) => {}
        Err(error) => return Err(map_push_error(error)),
    }
    Ok(())
}

fn is_missing_refspec(error: &git2::Error) -> bool {
    let text = error.message().to_lowercase();
    text.contains("couldn't find remote ref")
        || text.contains("not found")
        || text.contains("no matching")
}

fn fast_forward_branch(repo: &Repository, branch: &str, remote_oid: Oid) -> AppResult<()> {
    match repo.find_branch(branch, BranchType::Local) {
        Ok(local) => {
            let local_oid = local.get().peel_to_commit()?.id();
            if local_oid == remote_oid {
                return Ok(());
            }
            if repo.graph_descendant_of(remote_oid, local_oid)? {
                repo.reference(
                    &format!("refs/heads/{branch}"),
                    remote_oid,
                    true,
                    "sync pull",
                )?;
                return Ok(());
            }
            if repo.graph_descendant_of(local_oid, remote_oid)? {
                return Ok(());
            }
            // Tips diverged (often: version created from an older version). Keep the
            // remote tip as an extra version so Sync can publish both without merge.
            remember_extra_tip(repo, branch, remote_oid)?;
            Ok(())
        }
        Err(_) => {
            let commit = repo.find_commit(remote_oid)?;
            repo.branch(branch, &commit, false)?;
            Ok(())
        }
    }
}

fn is_empty_remote(error: &git2::Error) -> bool {
    let text = error.message().to_lowercase();
    text.contains("couldn't find remote ref")
        || text.contains("no matching")
        || text.contains("unborn")
        || text.contains("does not have any refs")
}

pub fn push_origin(repo: &Repository, token: Option<&str>) -> AppResult<()> {
    let mut remote = repo.find_remote("origin").map_err(|_| {
        AppError::msg("This user has no remote yet. Add one in Settings.")
    })?;
    let specs = push_refspecs(repo)?;
    if specs.is_empty() {
        return Err(AppError::msg("There is nothing to sync yet."));
    }
    let mut options = PushOptions::new();
    options.remote_callbacks(remote_callbacks(token));
    remote
        .push(&specs, Some(&mut options))
        .map_err(map_push_error)?;
    Ok(())
}

fn push_refspecs(repo: &Repository) -> AppResult<Vec<String>> {
    let mut specs = Vec::new();
    for reference in repo.references()?.filter_map(|item| item.ok()) {
        let Some(name) = reference.name() else {
            continue;
        };
        if let Some(branch) = name.strip_prefix("refs/heads/") {
            let force = needs_force_push(repo, branch, reference.target())?;
            let prefix = if force { "+" } else { "" };
            specs.push(format!("{prefix}{name}:{name}"));
        } else if name.starts_with("refs/rt/") {
            specs.push(format!("{name}:{name}"));
        }
    }
    Ok(specs)
}

fn needs_force_push(repo: &Repository, branch: &str, local_oid: Option<Oid>) -> AppResult<bool> {
    let Some(local_oid) = local_oid else {
        return Ok(false);
    };
    let remote_name = format!("refs/remotes/origin/{branch}");
    let Ok(remote_ref) = repo.find_reference(&remote_name) else {
        return Ok(false);
    };
    let Some(remote_oid) = remote_ref.target() else {
        return Ok(false);
    };
    if local_oid == remote_oid {
        return Ok(false);
    }
    if repo.graph_descendant_of(local_oid, remote_oid)? {
        return Ok(false);
    }
    Ok(true)
}

fn map_push_error(error: git2::Error) -> AppError {
    let text = error.message().to_lowercase();
    if text.contains("auth")
        || text.contains("credential")
        || text.contains("permission")
        || text.contains("authentication")
    {
        return AppError::msg(
            "The remote did not accept the token. Check the URL and token in Settings.",
        );
    }
    if text.contains("non-fast-forward")
        || text.contains("rejected")
        || text.contains("fetch first")
        || text.contains("updates were rejected")
    {
        return AppError::msg(
            "The remote changed during Sync. Try Sync again. If it keeps failing, import that remote as another user.",
        );
    }
    AppError::msg(format!("Sync failed. {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::DocumentFile;

    fn resume(content: &str) -> Vec<DocumentFile> {
        vec![DocumentFile {
            key: "resume".into(),
            name: "Resume".into(),
            kind: "resume".into(),
            content: content.into(),
        }]
    }

    struct TempRepo {
        dir: PathBuf,
        repo: Repository,
    }

    impl Drop for TempRepo {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.dir);
        }
    }

    fn temp_repo() -> TempRepo {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!("rt-git-test-{}", uuid::Uuid::new_v4()));
        let repo = init_repository(&dir).expect("init");
        TempRepo { dir, repo }
    }

    #[test]
    fn sync_pull_keeps_diverged_remote_tip_as_extra() {
        let temp = temp_repo();
        let repo = &temp.repo;
        let one = create_orphan_branch(&repo, "main", &resume("one"), "one", "tester").unwrap();
        let two = create_named_version(&repo, "main", &one, &resume("two"), "tester", "two").unwrap();
        let three =
            create_named_version(&repo, "main", &two, &resume("three"), "tester", "three").unwrap();
        let four =
            create_named_version(&repo, "main", &two, &resume("four"), "tester", "four").unwrap();

        write_working_files(repo, &resume("remote-only")).unwrap();
        let sig = signature("tester").unwrap();
        let tree_id = write_index_tree(repo).unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let three_commit = repo
            .find_commit(git2::Oid::from_str(&three).unwrap())
            .unwrap();
        let remote_only = repo
            .commit(None, &sig, &sig, "remote-only", &tree, &[&three_commit])
            .unwrap();

        repo.reference(
            "refs/remotes/origin/main",
            remote_only,
            true,
            "test remote tip",
        )
        .unwrap();

        fast_forward_branch(repo, "main", remote_only).unwrap();

        let tip = branch_tip(repo, "main").unwrap();
        assert_eq!(tip.to_string(), four);
        let listed: Vec<String> = list_versions(repo, "main")
            .unwrap()
            .into_iter()
            .map(|version| version.message)
            .collect();
        assert!(listed.contains(&"three".into()));
        assert!(listed.contains(&"four".into()));
        assert!(listed.contains(&"remote-only".into()));
        assert!(needs_force_push(repo, "main", Some(tip)).unwrap());
    }

    #[test]
    fn save_from_older_version_stays_listed_with_later_versions() {
        let temp = temp_repo();
        let repo = &temp.repo;
        let one = create_orphan_branch(&repo, "main", &resume("one"), "one", "tester").unwrap();
        let two = create_named_version(&repo, "main", &one, &resume("two"), "tester", "two").unwrap();
        let three =
            create_named_version(&repo, "main", &two, &resume("three"), "tester", "three").unwrap();

        let four =
            create_named_version(&repo, "main", &two, &resume("four"), "tester", "four").unwrap();

        let listed: Vec<String> = list_versions(&repo, "main")
            .unwrap()
            .into_iter()
            .map(|version| version.message)
            .collect();
        assert!(listed.contains(&"one".into()));
        assert!(listed.contains(&"two".into()));
        assert!(listed.contains(&"three".into()));
        assert!(listed.contains(&"four".into()));

        let four_row = list_versions(&repo, "main")
            .unwrap()
            .into_iter()
            .find(|version| version.id == four)
            .unwrap();
        assert_eq!(four_row.parent_id.as_deref(), Some(two.as_str()));
        assert_ne!(four, three);
    }

    #[test]
    fn delete_unsaved_returns_to_parent() {
        let temp = temp_repo();
        let repo = &temp.repo;
        let one = create_orphan_branch(&repo, "main", &resume("one"), "one", "tester").unwrap();
        let unsaved = create_unsaved(&repo, "main", &one, &resume("draft"), "tester").unwrap();
        let parent = delete_unsaved(&repo, "main", &unsaved).unwrap();
        assert_eq!(parent, one);
        let listed = list_versions(&repo, "main").unwrap();
        assert!(listed.iter().all(|version| !version.is_unsaved));
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, one);
    }

    #[test]
    fn later_variant_opens_on_draft_only() {
        let temp = temp_repo();
        let repo = &temp.repo;
        let one = create_orphan_branch(&repo, "main", &resume("one"), "one", "tester").unwrap();
        let draft = create_branch_from_commit(&repo, "other", &one, "tester").unwrap();
        let listed = list_versions(&repo, "other").unwrap();
        assert_eq!(listed.len(), 1);
        assert!(listed[0].is_unsaved);
        assert_eq!(listed[0].id, draft);
        assert_eq!(listed[0].parent_id.as_deref(), Some(one.as_str()));
        assert!(delete_unsaved(&repo, "other", &draft).is_err());
    }

    #[test]
    fn ensure_local_branches_creates_missing_locals() {
        let temp = temp_repo();
        let repo = &temp.repo;
        let one = create_orphan_branch(&repo, "main", &resume("one"), "one", "tester").unwrap();
        let other =
            create_named_version(&repo, "main", &one, &resume("two"), "tester", "two").unwrap();
        let oid = git2::Oid::from_str(&other).unwrap();
        repo.reference("refs/remotes/origin/feature", oid, true, "test remote")
            .unwrap();
        ensure_local_branches_from_remotes(&repo).unwrap();
        assert!(repo.find_branch("feature", BranchType::Local).is_ok());
        let listed = list_branches(&repo).unwrap();
        assert!(listed.contains(&"feature".into()));
        assert!(listed.contains(&"main".into()));
    }
}
