# Technical implementation

This document is for building the app. Product behavior still lives in the other docs. If this file and those files disagree, fix this file.

Read `version-model.md` before implementing Git, save, or user switching.

The goal is a Tauri desktop app: a web UI in front, Rust behind it for files, Git, and export. Do not keep a second copy of resume data that can drift from Git.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Shell | Tauri 2 | Desktop window, file dialogs, close hooks, talking to Rust |
| Frontend | React, TypeScript, Vite | Fits the shared component set |
| UI kit | shadcn, Tailwind | Compact monochrome controls |
| Icons | Lucide | The icon set that matches shadcn. Use it for actions and kinds whenever a control has a clear meaning |
| Backend | Rust | Files, Git, PDF export, user catalog |
| Git | libgit2 through the `git2` crate | Real repositories without depending on a Git install |
| HTML in a user | Files on disk in that repository | Git is the record |

Do not add another UI kit, another icon set, or a hosted API.

## Two kinds of state

Keep these apart. Mixing them is how the app starts lying.

**App catalog** lives in the app data folder, not inside a user repository. It only knows:

- Which users exist
- Each user's name and repository path
- Which user is open
- Each user's last place: variant, version, tab
- Each user's PDF export defaults

**User record** is the Git repository. It only knows:

- Variants (branches)
- Versions (commits)
- HTML files in those commits

Last place and export defaults are not committed. An exported user is still just a Git repository of HTML.

When the app starts, read the catalog, open the last user, then read that repository.

## Suggested folder layout

```
src/                         Frontend
  components/                Window chrome, sidebar, tabs, dialogs
  features/user/             Switch user, create user, import user
  features/variant/          List, search, create, import HTML
  features/version/          List, open, Unsaved
  features/document/         Tabs, add cover letter, add additional
  features/editor/           HTML text and preview
  features/export/           PDF modal
  lib/icons.ts               One place that names Lucide icons for this app
src-tauri/                   Rust
  src/catalog.rs             Known users and last place
  src/git_service.rs         All Git work
  src/user_service.rs        Create, import, switch, export a user
  src/write_service.rs       Create Unsaved or amend Unsaved
  src/document_service.rs    Read and write HTML files
  src/pdf_service.rs         Write a PDF
  src/commands.rs            What the frontend is allowed to call
```

Names can move. The split should not: catalog, Git, write, UI.

## Files inside a user repository

Use a boring, stable layout so import and export stay obvious.

```
resume.html                  Always present
cover-letter.html            Only if a cover letter exists
documents/
  some-name.html             Each additional document
```

Rules:

- Do not create `cover-letter.html` or `documents/` until something is added.
- Additional document names are the file names without `.html`.
- Opening a version means reading these files from that commit, not from whatever happens to be on disk from the last checkout.
- Writing a version means updating these files, then creating or amending the Unsaved commit.

If a later implementation needs a checkout to make Git tools happy, that is an internal detail. The editor must still show the selected commit's files.

## Backend components

### 1. App catalog

Own the list of users.

- Create a user: make an empty Git repository in a folder the app controls or the person chose, store the name and path.
- Import a user: copy or clone a repository, then store name and path. If that path or remote is already known, open the known user instead of duplicating it.
- Switch user: remember the current user's last place, then point "open user" at the other path.
- Forget nothing Git-related here. The catalog does not store HTML.

Identify a user by a stable id plus path, not by name alone. Names can repeat.

### 2. Git service

This is the only place that talks to Git. Everything else asks it.

It must be able to:

- Init a repository
- Open a repository at a path
- Clone a remote into a path
- Copy or open a local repository this app exported
- List branches (variants)
- Create the first branch only when the repository has none
- Create a later branch from an existing commit
- Switch the open branch
- List commits on a branch, newest first, stopping at that variant's starting commit (stored as a Git ref when the variant is created). Also list versions created later from an older version on the same variant (kept as Git refs so they stay visible)
- Read the file tree of a commit
- Create a commit with message `unsaved` from any finished version on the variant
- Amend the current `unsaved` commit
- Delete an `unsaved` commit and move the branch back to its parent when that commit was the tip
- Refuse to create a later branch from an `unsaved` commit
- Refuse to amend a finished commit
- Export by copying the whole repository, including `.git`, to a chosen folder
- Refuse to import a folder that is not a Git repository

Product words stay in the frontend. This service can think in branch and commit.

### 3. Write service

One function, used everywhere dirty files must be kept:

1. Compare the editor files to the selected version.
2. If they match, do nothing.
3. If the selected version is finished, create a new commit with message `unsaved` and the current files.
4. If the selected version is Unsaved, amend that commit with the current files.
5. If this fails, return an error. The caller does not navigate.

Call this before:

- Manual save
- Opening another version
- Opening another variant
- Switching user
- Quitting the window

Do not write this logic in four frontend handlers. The window-close hook in Tauri must call the same command.

### 4. User service

Thin layer over catalog plus Git:

- Create user: name → empty repo → catalog row → open it
- Import local or remote: path or URL → repo on disk → catalog row → open it
- Export user: current repo → chosen folder
- Switch user: write service first, then catalog switch, then load that repo

Never merge two repositories.

### 5. Variant and version loading

When a user opens:

1. List branches. Those are variants.
2. If a last variant is stored and still exists, open it. Otherwise open the first, or show the empty variant screen.
3. List commits on that branch. Those are versions. The commit with message `unsaved` is the Unsaved row and sits under its parent.
4. If a last version is stored and still exists, select it. Otherwise select the newest.
5. Read that commit's HTML files into the editor and preview.

Selecting a variant is "write, then switch branch, then load versions." Selecting a version is "write, then read that commit."

### 6. Documents

- Resume is `resume.html`. Always load it.
- Cover letter is present only when `cover-letter.html` exists in that commit.
- Additional documents are every file in `documents/`.
- Adding a cover letter or additional document updates the working files, then the write service creates or amends Unsaved.

The frontend does not invent empty tabs for missing files.

### 7. Preview and PDF

Treat imported HTML as untrusted.

- Show preview in an isolated frame that cannot reach the app or other files.
- PDF export prints the open document's HTML, not a screenshot of the whole window.
- Ask for folder and file name first. Use the current user's stored defaults when they exist, otherwise Downloads and the document name.

### 8. Commands the UI may call

Keep the frontend on a short list. Suggested commands:

- List users, create user, import user, switch user, export user
- List variants, create the first variant on an empty user, import HTML only on an empty user, create a later variant from a version, open variant
- List versions, open version, write Unsaved, finish a named version
- Add cover letter, add additional document
- Export PDF
- Choose folder, choose files

If a new command would let the UI create commits itself, stop. That belongs in the write service.

## Frontend components

### Window chrome

- Current user at the top of the sidebar, with a switch-user control
- Variant search and list
- Versions under the open variant, each with a three-dot control to create a variant from that commit
- Document tabs
- Header actions on the right: save if you want it visible, export
- Split view: editor left, preview right

Narrow windows may collapse the sidebar. Switch user, tabs, editor, preview, and export must still be reachable.

### App state

Hold only what the screen needs:

- Current user
- Variants of that user
- Current variant
- Versions of that variant
- Current version
- Documents on that version
- Current tab
- Whether the editor differs from the selected version
- Busy and error for the last action

When the person types, mark dirty and update preview. Creating the Unsaved row can happen on first difference or on the next write. The sidebar must show Unsaved as soon as the files differ. If the commit does not exist yet, show the row anyway, then let the next write create it.

### Dialogs

Keep them short and reuse the same shells:

- First run: user name, then create or import a variant
- Create user
- Import user (local folder or remote)
- Create variant (finished versions only)
- Delete Unsaved
- Import HTML files, then a mapping step if there are several
- Add additional document (name)
- Export PDF

### Editor

A plain HTML text surface is enough for v1. Do not add a formatting toolbar. Preview updates as they type.

## Icons

Use Lucide for every control that has a clear action or kind. Do not mix in another icon family. Do not draw one-off SVGs for actions Lucide already has.

Icons stay small, monochrome, and quiet. They support a label. They do not replace a label unless the control is a compact header action with a tooltip that uses the same word as the product language.

Use the same icon for the same action everywhere.

| Place | Lucide icon | Label or tooltip |
| --- | --- | --- |
| Current user | `User` | The user name |
| Switch user | `Users` or `ChevronsUpDown` | Switch user |
| Create user | `UserPlus` | Create user |
| Import user | `FolderInput` | Import user |
| Export user | `FolderOutput` | Export user |
| Search variants | `Search` | Search |
| Create first variant | `Plus` | Create new, empty user only |
| Version menu | `MoreHorizontal` | Version actions |
| Create variant from version | `Plus` | Create variant |
| Delete Unsaved | `Trash2` | Delete Unsaved |
| Import HTML | `FileInput` | Import, empty user only |
| Variant row | `GitBranch` is too Git. Use `Files` or `Folder` | Variant name |
| Finished version | `Circle` or `History` | Version message and time |
| Unsaved version | `Pencil` | Unsaved |
| Resume tab | `FileText` | Resume |
| Cover letter tab | `Mail` | Cover letter |
| Additional document tab | `File` | Document name |
| Add cover letter | `MailPlus` | Add cover letter |
| Add additional document | `FilePlus` | Add document |
| Save | `Save` | Save |
| Export PDF | `FileDown` | Export |
| Close dialog | `X` | Close |
| Confirm | keep the button label, no extra icon required | Export, Create, Import |
| Empty create | `Plus` | Create new |
| Empty import | `FileInput` | Import existing |
| Sidebar collapsed | `PanelLeft` | Open sidebar |
| Failed action | `AlertCircle` | The error text still does the talking |
| Busy | `LoaderCircle` | The action name |

Do not use `GitBranch`, `GitCommit`, or `GitMerge` in the main UI. Those leak Git.

Put the chosen names in `src/lib/icons.ts` (or the equivalent) so screens do not pick random Lucide icons later.

If a control has no honest Lucide match, use a label only. Do not stretch an unrelated icon.

## How the main paths are implemented

### First launch

1. Catalog is empty.
2. Ask for a user name. Create an empty repository and a catalog row.
3. Ask to create or import a variant. Create a branch with that name and a first commit that holds `resume.html`, plus any mapped imported files.
4. Open that user, variant, version, and the resume tab.

### Return launch

1. Read catalog. Open last user.
2. Open that user's last variant and version.
3. If the last version is Unsaved, select it and load those files.

### Edit and save

1. Person types. Preview updates. Unsaved appears under the finished version if it is not there.
2. Save asks for a version name, then writes a finished commit with that message.
3. Switch or quit writes Unsaved so the work is not lost.

### Switch user

1. Write service on the current user.
2. Store last place on the current user.
3. Open the other repository.
4. Restore that user's last place, or its empty screen.

### Import several HTML files

Only while the user has no variants.

1. Ask for a variant name.
2. Pick files.
3. If more than one, map each file to resume, cover letter, or additional.
4. Write only the mapped files into the first commit.

### Create a later variant

1. Three dots on a version.
2. Ask for a name.
3. Create a Git branch that points at that commit.
4. Open the new variant.

## Build order

Do not start with PDF or remote import. Build in this order so each step can be checked.

1. Tauri window, shadcn theme, Lucide, empty layout.
2. Catalog plus create user and switch user, even with empty repositories.
3. Create variant, list variants, open one, show `resume.html` in the split view.
4. Version list and opening an older commit.
5. Write service: dirty detection, create Unsaved, amend Unsaved, block failed switch.
6. Window close uses the write service.
7. Add cover letter and additional documents.
8. Import HTML, including the mapping modal.
9. Restore last user and last place.
10. PDF export.
11. Import and export a user repository, including a remote clone.
12. Narrow window behavior.

A step is not done until the matching product flow still reads as true.

## Checks that belong with the code

- Creating a user leaves other users untouched.
- Switching user never shows the previous user's variants.
- Editing a finished version creates one Unsaved commit, not a stack of them.
- Editing Unsaved amends that commit. Commit count does not grow.
- A failed write blocks switch and quit.
- Missing cover letter and additional files do not appear as empty tabs.
- Preview cannot run as the app. Imported HTML stays inside the preview frame.
- The same action uses the same Lucide icon on every screen that has that action.

## What this document is not

It does not replace the version model. It does not pick library versions for you beyond the stack above. It does not license extra features.

If you need a new major component, add a section here in the same sitting.
