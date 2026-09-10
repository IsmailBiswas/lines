# Interface guidelines

The interface should disappear behind the resume. These rules keep the app consistent when it is tempting to add one more control.

## Principles

Use these in order when a layout decision is unclear:

1. **Hierarchy** — They should see what matters first: the open document, then the current user, variant, and version, then actions.
2. **Contrast** — Separate things with contrast of size, weight, or shape, not with extra color.
3. **Balance** — Leave space. A compact control is still allowed to breathe.
4. **Consistency** — The same kind of action should look and sit in the same kind of place.
5. **Simplicity** — One primary action per region. Do not compete with the preview.
6. **Feedback** — Every important action should show that it started, finished, or failed.

## Theme

- The app has two themes: light and dark. A compact header control switches between them. The last choice is remembered on this machine.
- Chrome colors live in `src/theme/chrome.ts`. Editor highlight colors live in `src/theme/editor.ts`. Both themes use the same token names. Change values there when experimenting. Do not invent a third palette in a screen.
- Syntax color lives only in the HTML editor. Do not spread those hues onto buttons, badges, or the sidebar.
- The preview is the user's page. Do not restyle their resume to match the chrome.
- If you must signal danger or success, do it with words and weight first, not with a new hue.
- Use the shared component set (shadcn) so spacing, type, and controls stay related.

## Size and density

- This is not a large-button, marketing-site layout.
- Controls are compact. Padding should feel tight and even, not sparse and not crowded.
- Icons in the header and sidebar should be small and quiet. A label is better than a mystery icon when space allows.
- Use Lucide for every action and document kind that has a clear meaning. Same action, same icon. Pair the icon with a label, or with a tooltip that uses the product word, on compact header actions.
- Do not copy Bootstrap-sized primary buttons.

## Grid and space

- Use an 8-point spacing system. Padding, gaps, and control heights should land on multiples of 8.
- Use a 12-column layout for the main work area so the split view and its collapse behavior stay predictable.
- Align sidebar rows, tabs, and header actions to the same vertical rhythm.
- The sidebar header and the main header are the same height so their bottom edges meet as one line.

## Main layout

Default wide layout, left to right:

1. Sidebar, with the current user and switch-user control at the top
2. Document tabs plus the split view
3. Export and other rare actions in the header, top right

Default split view:

- Left: HTML editor
- Right: preview

The two panes should share height. The user is comparing source and result, not scrolling two unrelated pages. The sidebar width and the editor/preview split are resizable. A visible vertical divider marks each split. The preview pane is the preview: no padded frame around it.

When the window is narrow:

- Keep access to the sidebar and to switch user. Collapsing the sidebar behind a control is fine. Removing either is not.
- Stack editor above preview if they can no longer sit side by side with readable width.
- Tabs stay visible. If there are many additional documents, it is acceptable to let the tab row scroll. Do not hide the resume tab.

## Current user

- The open user is always visible. The control reads as the current user, not as a repository.
- Switching user is a compact list of known users, plus create user and import user.
- The selected user must be obvious. This is still a shape and weight change, not a color shout.
- Do not design this like a cloud account menu. There is no avatar store, no sign-out, and no password.

## Sidebar

- Variants are the primary list of the open user.
- Versions appear for the open variant, slightly indented under that variant.
- Draft is a child of the finished version it came from, not a floating extra row.
- Draft must be easy to spot: lighter structure, a clear label, and no chance of looking like a finished version.
- Version rows show the name only. The created time is a tooltip on hover.
- Search sits at the top of the variant list and only promises to filter names.
- After the user has work, do not show a + or import control in the sidebar. New variants come from the three-dot control on a version.
- Selected variant and selected version must both be obvious. Selection is a shape and weight change, not a color shout.

## Tabs

- Tabs look like tabs, but they are compact. They are not large pill buttons.
- The active tab is obvious at a glance.
- Tab labels are the document names. Resume is always there. Cover letter and each additional document appear only after they exist.
- There is a compact way to add a cover letter or another additional document. That control is not a fake empty tab.

## Editor and preview

- The editor is an HTML text surface with syntax highlighting that follows the open theme. Line numbers are fine. Do not add a formatting toolbar.
- The preview fills its split pane. Do not put a gap, padded card, or extra frame around it.
- The preview can zoom in and out. When a document first opens, the whole page fits in the pane.
- Do not put formatting toolbars above the HTML editor in v1. The product is a text-and-preview editor.
- Scroll of editor and preview can be independent in v1. If they later stay linked, that is an enhancement, not a current requirement.

## Export modal

- Short. Folder, file name, default hint, confirm, cancel.
- Enter in a dialog text field submits that dialog's primary action.
- The default path and name should be written as a sentence the user can trust, not as hidden behavior.
- Setting a default is a secondary action, not a second page.

## Empty and first-run

- First run is a calm empty state: name the first user, then Create new or Import existing for a variant.
- An existing user with no variants uses the same two variant actions. It does not ask for a user name again.
- After a multi-file import, a short mapping modal asks which file is the resume, which is the cover letter, and which are additional documents. Skip this modal when only one file was chosen.
- No feature tour.
- No fake sample resume unless the user asks for one later. v1 does not require a sample.

## Motion and feedback

- Keep motion short and functional: panels opening, rows appearing.
- When Draft appears, it should be noticeable without a bounce or flourish.
- Saving, exporting, and remote actions need a busy state and a finished state.
- Failures use a clear message near the action. Do not rely on color alone.

## Icons

- One library: Lucide. It is the set that matches shadcn.
- Use an icon whenever the control is an action or a kind: switch user, create, import, export, search, create new version, add document, tabs, Draft, empty states, sidebar collapse, busy, and failure.
- Do not use Git-branded Lucide icons in the main UI.
- The exact icon names live in `technical-implementation.md`. Do not pick a new Lucide icon for an action that already has one.

## Type

- Use a small type scale. The resume preview can be richer because that is user content. The app chrome stays modest.
- User names, variant names, version labels, and tab labels should be readable at sidebar density.
- Do not use display-sized headings in the app frame.

## What to refuse

- New accent colors "just for this badge." Syntax color stays in the editor.
- Wide primary buttons in the header.
- Extra settings that only exist to avoid making a default.
- Git words in the sidebar or the user switcher.
- A visual builder that turns the preview into the editor.
