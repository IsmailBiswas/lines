# Project initiation

This is the starting reference for Resume Tracker. Read this first if you are coming back to the project, onboarding yourself again, or trying to understand how the pieces fit together.

These documents exist to keep the product consistent. They are not a pitch.

## What this is

Resume Tracker is a desktop application for keeping versions of a resume, an optional cover letter, and any extra supporting documents the user adds.

It uses Git as the version system, not as a developer tool the person in front of the app has to learn. Three words do most of the work:

- A **user** is a Git **repository**. Switching user means opening a different repository. Each user is a complete, separate workspace. Variants, versions, and documents from one user never appear in another.
- A **variant** is a Git **branch**. The variant name is the branch name. A variant is one named line of work, such as a resume aimed at a role or company.
- A **version** is a Git **commit**. A version is one saved state of the files on that variant.

Every row in the version list is a commit, including Unsaved. **Unsaved** is a version whose commit message is `unsaved`. If the user opens that row and keeps editing, the app amends that same commit. It does not create another commit.

The files themselves are HTML. The user edits HTML on one side and sees the rendered page on the other. Other formats, such as PDF, are exports.

The application is built with Tauri, so the interface is a web UI and the local work (files, Git, export) is handled by a Rust backend.

## Why it exists

Resume files go stale, get overwritten, or end up as copies with unclear names. This project treats each named resume line as a history you can open, compare by switching versions, and export when needed.

The point is local control. Each user's data is a Git repository they can keep on disk, export, or open from a remote they already own. A person can keep several of those repositories on this machine and switch between them as users.

## Who this is for

- You, building and maintaining this as a solo developer.
- Anyone else who needs to understand the product without reading source files first.
- An agent or future-you making changes without drifting from the original intent.

## What v1 includes

- Create a user, or import a whole Git repository as a user.
- Switch user to move between completely separate workspaces. Only one user is open at a time.
- On an empty user, create the first variant or import HTML into it. After that, HTML import is gone.
- Create a later variant from a finished version: three dots on that version, then a name. That is a Git branch starting at that commit. Unsaved offers Delete Unsaved instead.
- Browse variants in a sidebar, search them by name, and open one.
- See the versions of the open variant and open any version.
- Edit and preview HTML for the resume, an optional cover letter, and as many additional documents as they create.
- Show Unsaved as its own version. Keep editing it by amending that commit. Save asks for a name and finishes the version. Switch and quit write Unsaved. Delete Unsaved drops that commit and returns to the finished version it came from.
- Export the current document as a PDF.
- Export the open user as a real Git repository folder. Importing that folder, or any other Git repository, adds or opens a user. It does not merge into the user who is already open.

## What v1 does not include

Leave these out unless a later document explicitly adds them:

- A visual drag-and-drop resume builder. Editing is HTML text plus live preview.
- Accounts, passwords, cloud identity, or a hosted backend. "User" here is a local workspace, not a login.
- People working in the same user at the same time. Switching user is how one person keeps separate work apart, not how two people collaborate.
- Automatic writing, rewriting, or scoring of resume content.
- Native phone or tablet store apps. The window should still work at small sizes.
- Merging one user with another, or merging a user with a remote that has diverged. v1 imports the whole repository as a user.

## How the project is structured

```
resume_tracker/
  draft.md                         Original notes. Keep them. Do not treat them as the live spec.
  README.md                        Short entry point.
  AGENTS.md                        Working rules for people and agents changing the app.
  src/                             Web UI
  src-tauri/                       Rust backend
  docs/
    README.md                      Map of these documents.
    project-initiation.md          This file.
    version-model.md               How Git maps to what the user sees.
    user-flows.md                  Main paths through the product.
    functional-requirements.md     What the product must do.
    non-functional-requirements.md How well it must do those things.
    interface-guidelines.md        Look, layout, and interaction rules.
    technical-implementation.md    How to build the major parts.
```

When the app exists, keep product documents in `docs/` and put implementation in the usual Tauri layout (a frontend folder and a Rust backend folder). Do not bury product decisions inside code comments only.

## How a version is organized

A version is one Git commit. Every HTML file in that commit belongs to that version.

The main screen shows those files as tabs above the editor:

1. **Resume** — always present. Created with the variant.
2. **Cover letter** — optional. Created only when the user asks, or when they map an imported file to it.
3. **Additional documents** — optional, no limit. Each one is another HTML file in the same commit. The user creates them from the UI, or maps imported files to this kind.

Switching tabs changes what is in the editor and preview. It does not change the selected variant or version. Saving writes every document that exists on the current version, not only the open tab.

Do not create an empty cover letter or empty additional document just to fill a slot. If those files are not there, those tabs are not there. Give the user a way to add them.

## How someone should use these documents

1. Read this file for the shape of the product.
2. Read `version-model.md` before changing sidebar, save, user switching, or Git behavior.
3. Read `user-flows.md` before changing screens or empty states.
4. Read the requirements files before adding or cutting a feature.
5. Read `interface-guidelines.md` before changing layout, type, or color.
6. Read `technical-implementation.md` before adding or splitting a major part of the app.
7. Follow `AGENTS.md` while making the change.
8. Update the document that the change affects. Do not leave the docs describing an older product.

`draft.md` is the original sketch. If draft and these documents disagree, these documents win. Update the documents on purpose; do not silently follow the draft.

## Decisions

These replace the earlier assumption list.

- A **user** is a Git repository and a complete workspace. The UI presents opening another repository as switching user. User names are free text.
- A **variant** is a Git branch on the open user. The name typed for it is the branch name. It is free text, not a role or company pattern the app suggests.
- The first variant exists only while the user is empty: create a resume or import HTML. Every later variant is a branch created from a chosen finished version. Unsaved is not a starting point for a variant.
- A **version** is a Git commit. Resume, cover letter, and every additional document that exists sit in that same commit.
- **Unsaved** is also a Git commit. Its message is `unsaved`. Selecting it and editing amends that commit. It does not create a new commit.
- Starting to edit a finished version creates an Unsaved version under it (a new commit with message `unsaved`). After that, further edits amend Unsaved.
- Documents are HTML only. Additional documents cannot be attached PDFs or other file types. PDF is an export.
- A new variant starts with a resume only. Do not create empty cover letter or additional files.
- HTML import is only for an empty user. After a multi-file import, a modal asks which file is resume, cover letter, or additional. Files they do not map are not added. Kinds they do not map are not created empty.
- The app is a local desktop app. It must still be usable when the window is narrow.
- PDF export prints the document in the active tab.
- "Last selected" means the last user, then that user's last variant, version, and tab.
- Creating a user runs `git init` in a new folder. Export copies that repository, `.git` included. Import accepts only a real Git repository.
- Switching user writes any Unsaved work on the current user first, then opens the other repository. The two users stay separate.
- Opening a remote means importing the whole Git repository as a user. v1 does not merge two histories or resolve conflicts.

## Success for v1

The product is in good shape when a person can:

- Create the first user and a first variant in one sitting without seeing Git language they do not need.
- Switch user and land in a completely separate workspace, then switch back to the last place on the previous user.
- Move between variants and versions and always know what they are looking at.
- Add a cover letter or more documents only when they want them.
- Edit, walk away, come back, and not lose work.
- Export a PDF they can send.
- Take the open user to another machine as a Git repository and keep working.
