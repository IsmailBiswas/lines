# User flows

These are the paths a person actually takes. If a screen or action is not on one of these paths, question whether it belongs in v1.

Keep the diagrams aligned with `version-model.md`. If a flow and the version model disagree, fix one of them on purpose.

A user is a Git repository. A variant is a Git branch. A version is a Git commit. Unsaved is a version whose message is `unsaved`.

## Map of the main screen

Once the open user has at least one variant, the window has four jobs:

1. **Current user** — see who is open, switch user, add a user.
2. **Sidebar** — find variants, open a variant, open a version, see Unsaved.
3. **Document tabs** — move between the resume and any other HTML documents on that version.
4. **Split view** — HTML on the left, rendered preview on the right.

The export control lives at the top right of the main screen, not inside the sidebar.

```mermaid
flowchart LR
  subgraph window [Main window]
    userSwitch[Current user and switch user]
    sidebar[Sidebar: variants and versions]
    tabs[Tabs: resume and any other documents]
    split[Editor and preview]
  end
  userSwitch -->|opens another repository| sidebar
  sidebar -->|opens a variant or version| split
  tabs -->|changes which document is shown| split
```

## First launch, nothing here yet

There are no users yet.

```mermaid
flowchart TD
  openApp[App opens]
  empty[Empty start screen]
  userName[Ask for a user name]
  choice{Create or import a variant?}
  nameNew[Ask for a variant name]
  nameImport[Ask for a variant name]
  createHtml[Start a new HTML resume]
  picker[Open a file picker for one or more HTML files]
  count{How many files?}
  oneFile[Use that file as the resume]
  mapModal[Ask which file is resume, cover letter, or additional]
  main[Main screen: that user open, variant selected]

  openApp --> empty --> userName --> choice
  choice -->|Create new| nameNew --> createHtml --> main
  choice -->|Import existing| nameImport --> picker --> count
  count -->|One file| oneFile --> main
  count -->|Several files| mapModal --> main
```

Rules for this path:

- The first name is the user name. That creates the first repository.
- The second name is the variant name and the Git branch name.
- Import accepts HTML only, and only while this user has no variants yet.
- One file becomes the resume. Several files go through a mapping modal: each file is resume, cover letter, or an additional document.
- Do not create a cover letter or additional document that was not imported or added.
- After the first variant exists, this import path is closed.
- After either choice, that user is open, the new variant is selected, and the resume tab is open.
- The left panel shows editable HTML. The right panel shows that HTML rendered.

## Opening the app when work already exists

```mermaid
flowchart TD
  openApp[App opens]
  restoreUser[Restore the last user]
  restorePlace[Restore that user's last variant, version, and tab]
  unsaved{Is that version Unsaved?}
  showUnsaved[Show that variant with Unsaved selected]
  showSaved[Show the last finished version]
  main[Editor and preview match that selection]

  openApp --> restoreUser --> restorePlace --> unsaved
  unsaved -->|Yes| showUnsaved --> main
  unsaved -->|No| showSaved --> main
```

Do not send anyone back through first-run create / import unless there are no users, or the open user has no variants.

## Switch user

```mermaid
flowchart TD
  openSwitch[Open switch user]
  list[See known users]
  pick{What do they choose?}
  write[Write Unsaved on the current user if needed]
  openUser[Open the other repository]
  restore[Restore that user's last place]
  addNew[Ask for a new user name]
  emptyRepo[Create an empty repository]
  emptyUser[That user's empty start screen]
  importRepo[Import a local or remote repository]
  addUser[Add or open it as a user]

  openSwitch --> list --> pick
  pick -->|An existing user| write --> openUser --> restore
  pick -->|Create user| write --> addNew --> emptyRepo --> emptyUser
  pick -->|Import user| write --> importRepo --> addUser --> restore
```

Rules for this path:

- Switching user opens another repository. It does not mix the two workspaces.
- Write the current user first. If that write fails, do not switch.
- A new user starts empty. They create or import a variant from that user's empty screen.
- Importing a repository adds a user. It does not fold those files into the user who was already open.

## Browse variants and versions

```mermaid
flowchart TD
  sidebar[User looks at the sidebar]
  search[Optionally types to filter variant names]
  pickVariant[Selects a variant]
  listVersions[Sidebar lists that variant's versions]
  pickVersion[Selects a version]
  show[Editor and preview show that version]

  sidebar --> search --> pickVariant --> listVersions --> pickVersion --> show
```

If the current files differ from the selected version, selecting another variant, version, or user follows the write-before-switch path below.

## Create a later variant from a version

```mermaid
flowchart TD
  menu[Three dots on a version]
  name[Ask for a variant name]
  branch[Create a Git branch at that commit]
  open[Open the new variant on that version]

  menu --> name --> branch --> open
```

This is the only way to add a variant after the user already has work. The three-dot control is on a finished version, not on Unsaved. The new branch starts at the chosen commit, not at the tip of some other branch and not from an empty tree. The new variant lists that starting version and later versions on this line only. Older parent versions stay on the variant they came from.

## Delete Unsaved

```mermaid
flowchart TD
  menu[Three dots on Unsaved]
  ask[Ask to delete]
  drop[Drop the Unsaved commit]
  parent[Open the finished version it came from]

  menu --> ask --> drop --> parent
```

This is the only way unnamed work is thrown away. Save still names it. Switch and quit still write it.

## Edit a finished version

```mermaid
flowchart TD
  finished[User is on a finished version]
  types[User edits HTML]
  mark[Unsaved appears under that version]
  preview[Preview updates]
  action{Save, or leave?}
  name[Ask for a version name]
  finish[Write a finished version with that name]
  leave[Write Unsaved, then switch or quit]

  finished --> types --> mark --> preview --> action
  action -->|Save| name --> finish
  action -->|Switch or quit| leave
```

The Unsaved row is a real version: a Git commit with message `unsaved`. It must appear as soon as the files differ. This path works from any finished version on the variant, not only the latest. Save names that work and keeps it on the same variant. Versions that were already there stay listed. Switching and quitting keep unnamed work as Unsaved.

## Keep editing Unsaved

```mermaid
flowchart TD
  openUnsaved[User selects the Unsaved version]
  types[User edits HTML]
  preview[Preview updates]
  action{Save, or leave?}
  name[Ask for a version name]
  finish[Amend that commit into a finished version]
  leave[Amend Unsaved, then switch or quit]

  openUnsaved --> types --> preview --> action
  action -->|Save| name --> finish
  action -->|Switch or quit| leave
```

Selecting Unsaved and continuing amends that commit. Do not stack a second Unsaved under the first.

## Leave or quit with unwritten files

```mermaid
flowchart TD
  dirty[Current files differ from the selected version]
  action{They save, switch version, switch variant, switch user, or quit}
  write[Create Unsaved or amend Unsaved]
  ok{Write succeeded?}
  stay[Stay where they are and explain the failure]
  next[Complete the switch or quit]

  dirty --> action --> write --> ok
  ok -->|Yes| next
  ok -->|No| stay
```

This is one path with those triggers. Create or amend depends only on whether Unsaved already exists for this edit.

## Move between documents

```mermaid
flowchart TD
  tabs[User sees tabs for files that exist]
  switch[Clicks a tab]
  show[Editor and preview show that file]
  add[User adds a cover letter or additional document]
  newTab[A new tab appears for that file]

  tabs --> switch --> show
  tabs --> add --> newTab
```

Tab changes should feel instant and local:

- Same variant.
- Same version, including Unsaved.
- Only the editor and preview content change.

Edits in any tab belong to the current version. Adding a file on a finished version creates Unsaved. Adding a file on Unsaved amends it.

There is no empty cover letter tab and no reserved additional tab. Those appear after the user creates or imports them. Additional documents have no limit.

## Export a PDF

```mermaid
flowchart TD
  click[User clicks export at the top right]
  modal[Modal asks for folder and file name]
  hint[Modal also offers a default folder and name]
  confirm[User confirms]
  write[Write a PDF of the open document]
  done[Return to the main screen]

  click --> modal --> hint --> confirm --> write --> done
```

Defaults:

- Folder: the user's Downloads folder, unless they have set a default.
- Name: taken from the HTML document they are exporting.

The modal should make the default obvious and let the user set a new default for next time.

## Take the open user elsewhere

```mermaid
flowchart TD
  start[Export the current user]
  writeRepo[Write that repository out]
  later[On this or another machine]
  importUser[Import it as a user]
  open[That user is now available to switch to]

  start --> writeRepo --> later --> importUser --> open
```

Export copies the open user's Git repository, including `.git`. Import opens that folder, or another Git repository, as a user. v1 does not merge that repository into a user who is already open.

## What good feels like

- First sitting is short. User name, then a variant, then work.
- The chrome always answers: which user, which variant, which version, is anything unsaved.
- Switching user feels like changing person, and the work on the other side is completely separate.
- The split view always answers: what does this HTML look like.
- Leaving is safe. The app would rather block a switch than throw work away.
