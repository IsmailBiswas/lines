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

- The app has two themes: light and dark. The switch lives in Settings (the cog). The last choice is remembered on this machine.
- Chrome colors live in `src/theme/chrome.ts`. Editor highlight colors live in `src/theme/editor.ts`. Both themes use the same token names. Change values there when experimenting. Do not invent a third palette in a screen.
- Syntax color lives only in the HTML editor. Do not spread those hues onto buttons, badges, or the sidebar.
- The preview is the user's page. Do not restyle their resume to match the chrome.
- If you must signal danger or success, do it with words and weight first, not with a new hue.
- Use the shared component set (shadcn) so spacing, type, and controls stay related.

## Size and density

- This is not a large-button, marketing-site layout.
- Type, icons, and list rows stay compact.
- Larger regions (dialogs, the sidebar list, empty states, Settings) need 16–24px of space around them so the window does not feel rigid. Compact controls still sit inside that space.
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
3. Create new version, Export, then Settings at the far right of the header

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
- Each known user has a three-dot control. Rename User asks for a new name and updates the catalog only.
- The selected user must be obvious. This is still a shape and weight change, not a color shout.
- Do not design this like a cloud account menu. There is no avatar store, no sign-out, and no password.
- Settings is a cog menu on the far right. Theme, Sync, and the open user's remote live there. Sync is not a standalone header icon.

## Sidebar

- Variants are the primary list of the open user.
- Versions appear for the open variant, slightly indented under that variant.
- Draft under a finished version is a child of that version, not a floating extra row. The opening Draft on a new later variant stands alone until a finished version exists.
- Draft must be easy to spot: lighter structure, a clear label, and no chance of looking like a finished version.
- Version rows show the name only. The created time is a tooltip on hover.
- Search sits at the top of the variant list and only promises to filter names. Leave clear space under the user header rule, and keep the gap to the first variant tight.
- After the user has work, do not show a + or import control in the sidebar. New variants come from the three-dot control on a version.
- Selected variant and selected version must both be obvious. The open variant and its versions share one quiet background so the group reads as one block. Selection is a shape and weight change, not a new hue.
- Opening or closing a variant's versions should animate. Do not snap the list in or out.
- Collapsed variant rows sit close together. Do not leave large empty gaps between unselected variants.

## Tabs

- Tabs look like tabs, but they are compact. They are not large pill buttons.
- The active tab is obvious at a glance.
- Tab labels are the document names. Resume is always there. Cover letter and each additional document appear only after they exist.
- There is a compact way to add a cover letter (labeled) or another additional document (a + icon with tooltip Add Document). That control is not a fake empty tab.
- Search sits under the user switcher with clear space below the header rule, then sits close above the first variant.

## Editor and preview

- The editor is an HTML text surface with syntax highlighting that follows the open theme. Line numbers are fine. Do not add a formatting toolbar.
- The preview fills its split pane. Do not put a gap, padded card, or extra frame around it.
- The preview can zoom in and out. When a document first opens, the whole page fits in the pane.
- Do not put formatting toolbars above the HTML editor in v1. The product is a text-and-preview editor.
- Scroll of editor and preview can be independent in v1. If they later stay linked, that is an enhancement, not a current requirement.

## Export modal

- Title only. Do not put explanatory copy under Export or Remote.
- Accordion rows for resume file name, save location, and files. Each row is a text control with no outline. The chevron sits on the left of the label. Collapsed rows show the current value after a colon. Labels use Title Case.
- Files default to every document on the open variant, each with a checkbox.
- Enter in a dialog text field submits that dialog's primary action.
- While PDFs are being written, keep the modal open and show a loader.
- Remember the resume file name and save location on that user after a successful export.

## Remote modal

- Title only. URL and token fields sit on the dialog, not under a description.
- Accordion row labeled Create Repository, same treatment as export rows: no outline, chevron on the left.
- Expanding it shows a single-select for GitHub or GitLab, then copy for that host, then one Open button at the bottom right. Open only launches that host's new-repository page. The person creates the repository and an access token there, then pastes both into this dialog.

## Empty and first-run

- First run creates user Default automatically, then shows Create New or Import Existing for a variant. There is no first-run user-name dialog.
- Create New and Import Existing on an empty user both use variant Base. Neither asks for a variant name. Import Existing opens the file picker next.
- Text fields in the app chrome do not offer browser suggestions or autofill.
- An existing empty user uses the same two variant actions.
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
- Action labels, menu items, dialog titles, tooltips, and field labels use Title Case (for example Create New User, Add Cover Letter). Body copy and helper sentences stay sentence case.
- Do not use display-sized headings in the app frame.

## What to refuse

- New accent colors "just for this badge." Syntax color stays in the editor.
- Wide primary buttons in the header.
- Extra settings that only exist to avoid making a default.
- Git words in the sidebar or the user switcher. Remote words stay in Settings.
- A visual builder that turns the preview into the editor.
