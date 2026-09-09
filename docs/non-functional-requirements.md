# Non-functional requirements

These are the qualities the product must have while doing the work in the functional list. They are still requirements. A feature that works but fails these is not done.

## Safe with the user's work

- Never drop Unsaved work to make navigation, user switching, or shutdown easier.
- Never show one user's variants, versions, or documents while another user is open.
- Never write a version that drops a document because that tab was not open.
- Never invent empty cover letter or additional files just to make a write look complete.
- Never leave the sidebar saying one thing and the editor showing another.
- If a save, export, import, or remote action fails, say so in plain language and leave the user where they were.

This is the highest bar in the project. Look is secondary to not losing work.

## Local and understandable

- The app must work without a network connection for create, import file, edit, save, browse, and PDF export.
- Network is only required when the user chooses a remote action.
- Each user on disk must remain a normal Git repository a person could copy themselves.
- Do not hide the only copy of a user's files inside an opaque application store if that repository folder can be explicit.

## Fast enough to feel direct

These are targets, not slogans:

- Opening the app to a known user should feel immediate on a normal laptop. If restore takes noticeable time, show that the app is opening the last user rather than drawing an empty window.
- Switching user should feel like opening another workspace, not like restarting the app.
- Switching tabs should feel instant.
- Typing in the HTML editor should update the preview without a separate refresh action.
- Switching versions should be quick enough that browsing history feels like moving through a list, not opening files one by one.
- Sidebar search should filter as the user types.

If a later version history is very long, keep the sidebar usable. Do not load the product with a progress theater for a few dozen versions.

## Clear in a small window and a large one

- The same product must work in a wide desktop window and in a narrow window.
- In a narrow window, they must still reach switch user, variants, versions, tabs, editor, preview, and export. It is acceptable to stack or collapse regions. It is not acceptable to hide a required action with no way to open it.
- Touch targets and click targets stay usable when the window is compact. Compact is not the same as cramped.

## Interface quality

The detailed rules live in `interface-guidelines.md`. The quality bar is:

- Monochrome.
- Compact controls.
- Quiet enough that the resume is the loudest thing on the screen.
- Consistent spacing and type so the app does not feel handmade in one corner and generic in another.

## Honest language

- Use the product words from `version-model.md`.
- Error text should name the action that failed and what the user can do next.
- Do not blame Git, Rust, or the webview in the main interface.

## Accessible enough for daily use

- Text and chrome must meet a strong contrast standard. A monochrome theme is not an excuse for light gray on light gray.
- Keyboard users must be able to move between switch user, sidebar, tabs, editor, and the export action.
- Focus must be visible.
- The preview is content. The surrounding app chrome should not trap keyboard focus inside the preview with no way out.

## Safe with files and remotes

- File pickers and export dialogs may only write where the user confirmed.
- Do not send a user's content anywhere unless they start a remote action.
- Do not store remote credentials in that user's repository.
- Treat imported HTML as untrusted content in the preview. A resume should not become a way to run unexpected code in the app.

## Maintainable by one person

- One obvious place for product rules: these documents.
- One obvious place for working rules: `AGENTS.md`.
- Features stay small enough that a solo developer can finish and check them.
- Avoid a second source of truth for versions, settings, or documents.

## Durable enough for real use

- Unexpected shutdown should not corrupt the open user. Unsaved is a real commit, so it should still be there on next launch once it has been written.
- PDF export should produce a file the user can open in a normal reader.
- Importing a user this app exported should open without a conversion step.

## What we are not optimizing for in v1

- Very large teams or shared editing of the same user.
- Thousands of variants.
- Perfect print layout for every possible HTML the user might paste.
- Pixel-identical preview and PDF in every edge case. They should be close. The preview is still the guide.
