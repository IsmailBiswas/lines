# Functional requirements

This is the list of product behavior for v1. If it is not here, it is not required yet.

Each item is written so a person can check it without reading code.

A user is a Git repository. A variant is a Git branch. A version is a Git commit. Unsaved is a commit whose message is `unsaved`.

## Users

- The app can know many users. Only one user is open at a time.
- A user is a complete workspace: one Git repository. That user's variants, versions, and documents do not appear in any other user.
- The interface presents opening another repository as switching user, not as switching repo or workspace.
- A user name is free text. It is not a login, password, or cloud account.
- With no users, the first sitting asks for a user name, then create or import a variant.
- An open user with no variants only shows create and import for a variant.
- On later launches, the app opens the last user and that user's last place.
- The person can switch to another known user.
- The person can create a new user. That creates a new empty repository.
- The person can import a local or remote Git repository as a user. If that repository is already a known user, open that user.
- Importing a repository does not merge it into the user who is already open.
- The person can export the open user as a Git repository.
- Switching user writes Unsaved on the current user first. If that write fails, the app does not switch.

## Variants

- The user can create a new variant by giving it a name. That name is the Git branch name. That creates a new HTML resume only.
- The user can import one or more HTML files into a new variant by giving the variant a name and choosing the files.
- If several files are imported, the app asks the user to map each file to resume, cover letter, or additional document before finishing.
- The sidebar lists variants by name.
- The user can search the sidebar list by variant name.
- Selecting a variant opens that variant and shows its versions.
- Variant names are free text chosen by the user. The app does not rename them in the background and does not suggest role or company patterns.

## Versions

- Each variant has a history of versions. Each version is a Git commit.
- Selecting a version shows the files in that commit in the editor and preview.
- A version contains every document that existed at that moment: the resume, plus cover letter and additional documents only if they exist.
- Creating or importing a variant also creates the first version.

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
- Editing a finished version creates Unsaved. Editing Unsaved amends that same version.

## Unsaved and writing

- When the user starts changing a finished version, the sidebar shows an Unsaved row under that version.
- Unsaved is a version: a Git commit with message `unsaved`. It is visually distinct from finished versions.
- If the user selects Unsaved and continues editing, later writes amend that commit. They do not create a new commit.
- The user can save on purpose. That writes Unsaved and leaves it selected.
- If they try to select another version, select another variant, switch user, or close the app while current files differ, the app writes first.
- If there are no changes, the app does not create or amend a commit.
- If a required write fails, the app does not switch or quit, and it tells the user why.

## Export to PDF

- From the main screen, the user can open an export action in the top right.
- Export asks for a folder and a file name before writing the file.
- The suggested folder is Downloads, unless the user has set a default folder.
- The suggested file name comes from the document being exported.
- The user can set a default folder and name pattern from that same modal.
- Confirming export writes a PDF of the document in the open tab.

## Returning to the app

- On later launches, the app opens the last user.
- It then restores that user's last variant, version (including Unsaved), and document tab, when that information is still valid.
- If the last user is gone, open a remaining user, or the first-run empty screen.
- If that user's last variant is gone, open a remaining variant, or that user's empty screen.

## Settings the product needs

These are product settings, not a junk drawer:

- Default PDF export folder, stored on the current user.
- Default PDF file name pattern, stored on the current user.
- A way to create a user, switch user, and import a whole repository as a user.

Do not add preference pages for things the interface can do directly.

## Out of scope for this list

The following are not v1 features, even if they are easy to imagine:

- Searching inside document text.
- Comparing two versions side by side.
- Making a new variant from an old version. A later release may want this; v1 does not require it.
- Documents that are not HTML.
- Attaching a PDF as an additional document.
- Merging one user with another, or conflict resolution with a remote.
- Accounts, passwords, or signing in.
- Two people editing the same user at once.
- Sending email, applying to jobs, or talking to job boards.
