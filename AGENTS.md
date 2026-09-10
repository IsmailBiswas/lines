# Working rules

This file is for anyone changing Resume Tracker, including an agent. The product documents in `docs/` are the source of truth for behavior. This file is the source of truth for how to work.

Read `docs/project-initiation.md` and `docs/version-model.md` before the first change in a session. Read `docs/technical-implementation.md` before adding a major component.

## What good work looks like

- The user does not lose work.
- The sidebar, the tabs, and the split view always agree.
- The interface stays compact and quiet. Light and dark themes are both first-class. Syntax color is only in the HTML editor.
- The workspace on disk stays a real Git repository.
- A change is finished only when the matching document still describes the product.

Pretty code that drifts from the documents is not a good change.

## Before you change something

1. Find the document that already describes the behavior.
2. If the change is new behavior, update that document first or in the same sitting.
3. Stay inside v1 scope. Do not add a visual builder, logins, collaboration, or Git concepts in the main UI. Switching user is required. It is not a login.
4. If the request conflicts with the documents, say so and ask. Do not silently pick a new product direction.

## Product constraints you do not get to reinterpret

- A user is a Git repository and a complete workspace. The UI presents opening another repository as switching user.
- A variant is a Git branch. A version is a Git commit. Draft is a commit whose message is `unsaved`.
- HTML import and empty-variant create exist only on an empty user. Later variants are branches created from a chosen version.
- Exporting a user copies a real Git repository, `.git` included. Importing a user requires a real Git repository.
- Users do not share variants, versions, or documents. Never mix two repositories in one screen.
- Editing a finished version creates Draft. Editing Draft amends that same commit.
- Create new version asks for a version name and writes a finished commit. Switch and quit still write Draft.
- Resume, cover letter, and every additional document that exists live in the same version. There is no cap on additional documents. Do not create empty ones.
- HTML is the stored form. PDF is an export.
- Write happens on save (named), on switch (version, variant, or user), and on quit. Failed write blocks the switch or quit.
- Search is variant-name search in v1.
- The stack is Tauri: web UI in front, Rust for files, Git, and export.
- UI uses the shared component set. Chrome tokens live in `src/theme/chrome.ts`. Editor highlight tokens live in `src/theme/editor.ts`. Controls stay compact. Spacing follows an 8-point grid. The main work area follows a 12-column layout.
- Icons come from Lucide only. Use an icon on every action and document kind that has a clear meaning. Same action, same icon. Do not use Git-branded icons in the main UI. See `docs/technical-implementation.md`.

## Interface discipline

Follow `docs/interface-guidelines.md` instead of inventing a look per screen.

- Do not introduce new colors.
- Do not use large marketing-style buttons.
- Do not put Git words in the sidebar, the user switcher, or empty states.
- Do not hide export, switch user, sidebar, or tabs on small windows.
- Do not add toolbars that turn the HTML editor into a word processor.

## Reliability discipline

Follow `docs/non-functional-requirements.md`.

- Treat imported HTML as untrusted in the preview.
- Do not write files outside a path the user confirmed.
- Do not put secrets or remote credentials in a user's repository.
- Do not create a second database that can disagree with Git.
- Prefer blocking an action over destroying Draft work.

## How to keep the project understandable

- Prefer clear names over clever names.
- Keep product language stable: user, switch user, variant, version, draft, export, import. The UI label is Draft. The Git commit message stays `unsaved`.
- Put product decisions in `docs/`, not only in chat or in comments.
- Keep `draft.md` as the original sketch. Do not patch it into a second spec.
- When a flow changes, update the mermaid in `docs/user-flows.md`.
- When a major component changes, update `docs/technical-implementation.md`.

## Scope control

v1 is a local versioned editor. Separate Git repositories are separate users. A person can switch user, export the open user, and import a repository as a user.

Refuse, or ask first, if a request would add:

- Rewriting or scoring resume text
- A template marketplace
- Side-by-side diff as a required feature
- Documents that are not HTML
- A custom file format that replaces Git
- Merge or conflict-resolution flows with a remote
- Logins, passwords, or cloud accounts
- Mobile store packaging

Small implementation choices are fine. New product surface is not fine without a document update.

## Checking your work

Before you consider a change done:

- Walk the relevant path in `docs/user-flows.md` as a user would.
- Confirm Draft create-versus-amend behavior if you touched editing or navigation.
- Confirm the last-opened user and variant still restore if you touched startup.
- Confirm two users cannot see each other's work if you touched switching user.
- Confirm a narrow window can still reach the thing you added.
- Update documents if behavior changed.

If you cannot open the app, say what you could not check.
