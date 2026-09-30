# Functional requirements

This is the list of product behavior for v1. If it is not here, it is not required yet.

Each item is written so a person can check it without reading code.

A user is a Git repository. A variant is a Git branch. A version is a Git commit. Draft is a commit whose message is `unsaved`.

## Users

- The app can know many users. Only one user is open at a time.
- A user is a complete workspace: one Git repository. That user's variants, versions, and documents do not appear in any other user.
- The interface presents opening another repository as switching user, not as switching repo or workspace.
- A user name is free text. It is not a login, password, or cloud account. It is stored in the app catalog. The repository folder on disk uses a stable id, not the display name.
- The person can rename a user from the three-dot control on that user in Switch User. Renaming updates the catalog name only. It does not rename or rewrite the Git repository.
- With an empty catalog, the first launch creates a user named Default and opens it. There is no user-name prompt on that path.
- An open user with no variants only shows Create New or Import Existing for a variant.
- Create New on an empty user creates the first variant named Base. It does not ask for a variant name.
- Import Existing on an empty user imports HTML as variant Base. It does not ask for a variant name.
- On later launches, the app opens the last user and that user's last place.
- The person can switch to another known user.
- The person can create a new user. That creates a new empty repository.
- The person can import a local Git repository folder as a user. That folder must already be a Git repository, including one this app exported. If it is already a known user, open that user.
- The person can import a remote Git repository as a user by cloning it with an HTTPS URL and a token. Clone restores every remote variant as a local branch, keeps this app's variant refs, and stores the token for Sync.
- Importing a repository does not merge it into the user who is already open.
- The person can export the open user to a folder. That folder is a real Git repository and can be imported again as a user.
- The person can set a remote on the open user from Settings by entering a private repository URL and a token. The token is stored with the catalog, not inside that user's Git repository.
- Sync writes Draft if needed, then uses the token to pull and push. Fast-forward when possible. When the tip moved because a version was created from an older version, keep the previous remote tip as an extra version ref and update the remote tip to match local so no version is lost. It does not merge.
- Switching user writes Draft on the current user first. If that write fails, the app does not switch.

## Variants

- If the open user has no variants, Create New creates the first variant named Base with a new HTML resume. It does not ask for a name.
- If the open user has no variants, Import Existing imports one or more HTML files as variant Base. It does not ask for a name. If several files are imported, a mapping step asks which file is resume, cover letter, or additional.
- After the user has any variant, HTML import is not available.
- After the user has any variant, a new variant is created only from a finished version: the three-dot control on that version, then a name. In Git this is a new branch from that commit with a Draft on top. The new variant shows only that Draft at first. Draft does not offer Create variant.
- There is no + control that creates a variant from nothing once the user has work.
- The sidebar lists variants by name.
- The user can search the sidebar list by variant name.
- Selecting a variant opens that variant and shows its versions: the starting version and anything after it on that variant. The variant it was created from still shows its own older versions.
- Variant names are free text chosen by the user. The app does not rename them in the background and does not suggest role or company patterns.

## Versions

- Each variant has a history of versions. Each version is a Git commit.
- Selecting a version shows the files in that commit in the editor and preview.
- A version contains every document that existed at that moment: the resume, plus cover letter and additional documents only if they exist.
- Creating or importing the first variant also creates the first version. A later variant opens on a Draft made from the chosen finished version. That source version stays on its own variant and is not listed on the new one.

## Documents

- The resume tab is always present on a variant.
- Cover letter and additional documents appear only after the user creates them or maps imported files to them.
- The user can create a cover letter from the UI if one is not already there.
- The user can create as many additional documents as they want. There is no cap.
- Only one tab is shown in the split view at a time.
- Switching tabs does not change the selected variant or version.
- Each document is stored and edited as HTML. Other file types are not documents in this app.
- The app does not create empty cover letter or additional files to fill a layout.

## Editing and preview

- The main work area is a split view: editable HTML on the left, rendered preview on the right.
- Changing the HTML updates the preview.
- Preview is the document as a page, not a dump of tags.
- Editing a finished version creates Draft. That finished version can be any version on the variant, not only the latest. Editing Draft amends that same version.
- Creating a new version from that Draft writes a finished version on the same variant. Other versions already on the variant stay listed.

## Draft and writing

- When the user starts changing a finished version, the sidebar shows an Draft row under that version.
- Draft is a version: a Git commit with message `unsaved`. It is visually distinct from finished versions.
- If the user selects Draft and continues editing, later writes amend that commit. They do not create a new commit.
- The user can create a new version on purpose. That action asks for a version name and writes a finished version with that name. Draft is gone after that.
- The three-dot control on Draft is Delete Draft when a finished parent exists on that variant. It asks first, then drops that Draft commit and opens the finished version it came from. The opening Draft on a newly created later variant cannot be deleted. Finished versions cannot be deleted.
- If they try to select another version, select another variant, switch user, or close the app while current files differ, the app writes first.
- If there are no changes, the app does not create or amend a commit.
- If a required write fails, the app does not switch or quit, and it tells the user why.

## Export to PDF

- From the main screen, the user can open an export action in the top right.
- Export writes a PDF for each selected document on the open variant. By default every document on that variant is selected.
- The PDFs go into a new folder inside the chosen save location. The folder name comes from the resume file name.
- The modal uses compact accordion rows for resume file name, save location, and which files to export. The chevron sits on the left. A collapsed row shows the current value after a colon. There is no outline on those rows and no description under the title.
- The suggested folder is Downloads, unless they have set a default. The suggested resume file name is remembered on that user when they export.
- The modal shows a loader until every selected PDF is written.

## Returning to the app

- On later launches, the app opens the last user.
- It then restores that user's last variant, version (including Draft), and document tab, when that information is still valid.
- If the last user is gone, open a remaining user, or the first-run empty screen.
- If that user's last variant is gone, open a remaining variant, or that user's empty screen.

## Settings the product needs

These are product settings, not a junk drawer:

- Default PDF export folder, stored on the current user.
- Default PDF file name pattern, stored on the current user.
- A way to create a user, switch user, and import a whole repository as a user.
- Theme, in Settings, not as a standalone header control.
- The open user's remote address, stored as that repository's `origin`.
- That user's remote token, stored in the catalog.
- Sync, in Settings, which pulls and pushes with that token, including publishing extra version refs when a tip moved from an older version.

Do not add preference pages for things the interface can do directly.

## Out of scope for this list

The following are not v1 features, even if they are easy to imagine:

- Searching inside document text.
- Comparing two versions side by side.
- Documents that are not HTML.
- Attaching a PDF as an additional document.
- Merging one user with another, or conflict resolution with a remote.
- Signing in to this app. A remote token is host access for Sync, not an app login.
- Two people editing the same user at once.
- Sending email, applying to jobs, or talking to job boards.
