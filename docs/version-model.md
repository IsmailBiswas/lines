# Version model

This is the most important product document. The sidebar, the editor, and Git are three views of the same model. If those views disagree, the app feels broken.

The interface uses product words. This document also names the Git fact behind each one, because that fact is the product.

## The words

| Product word | Git fact | Meaning |
| --- | --- | --- |
| User | One repository | A complete, separate workspace. Switching user opens that repository. |
| Variant | A branch on the open user. The variant name is the branch name. | One named line of work |
| Version | A commit | One saved state of the files on that variant |
| Unsaved | A commit whose message is `unsaved` | Work still in progress. Further edits amend this commit. |

A user is a Git repository. A variant is a Git branch. A version is a Git commit. Unsaved is not a working-tree leftover. It is a version, which means it is a commit.

The person using the app should not have to say "repository", "branch", or "commit". The app must still keep each user as a real Git repository so export and remotes stay honest.

## User

A user is one Git repository and one complete workspace. The interface presents this as the current user, not as a repo switcher.

There are as many users as there are repositories this app knows. Only one user is open at a time.

What belongs to a user stays with that user:

- Every variant
- Every version
- Every document
- That user's last place (variant, version, tab)
- That user's PDF export defaults

None of that is visible while another user is open. Switching user is how separate work stays separate.

Creating a user creates a new empty Git repository (`git init`) and asks for a free-text user name. That folder is a real repository from the first moment, even before it has a variant.

Exporting a user copies that whole repository, including the `.git` folder, to a folder the person chooses. The export is a normal Git repository. Anyone can open it with Git. This app can import that same folder as a new user.

Importing a local folder requires it to already be a Git repository. Importing a remote clones it. Import never merges into the user who is already open.

Do not invent a second database that can drift from Git. Git is the record inside each user. The catalog only remembers names and paths.

Switching user follows the same write-first rule as switching variant or version. If the write fails, stay on the current user.

## Variant

A variant is a Git branch. The name the person types is the branch name. It is free text.

The sidebar lists variants of the open user. They can search that list by name. Selecting a variant opens it: the app switches to that branch and shows **this variant's** versions.

A later variant starts at the version it was created from. Git still keeps the older parent commits (that is real history). The UI does not show those parents. It shows the starting version and anything written after it on this variant.

The starting version is stored in the repository as a Git ref for that branch. It is not a second database. The original variant keeps its own start, so its older versions stay visible even after another variant is created from its latest version.

Variant names should stay readable in a compact sidebar. Do not encode dates or file types into the name unless the user types them.

There are two ways a variant appears:

1. **First variant, empty user only.** Create a new HTML resume, or import HTML files. That creates the first branch and its first commit. After the user has any variant, HTML import is gone.
2. **Later variants.** A new variant is a Git branch created from an existing version (commit). The three-dot control on a version asks for a name, then creates a branch that starts at that commit. It does not start from thin air and it does not start from whatever branch happens to be open.

Do not offer a + control that creates an empty variant after work already exists.

## Version

A version is a Git commit. Selecting a version fills the editor and preview with the HTML files in that commit.

A version holds every document that existed at that moment:

- The resume, always.
- The cover letter, if the user has created or imported one.
- Each additional document the user has created or imported. There is no cap.

There are not three reserved empty files. Missing files are missing. They do not appear as blank tabs.

The open tab decides which of those files is shown, not which version is open.

Versions are listed under the open variant, newest first unless a later decision says otherwise. Each row should be identifiable at a glance. Prefer the commit message plus a time over a raw hash. The Unsaved row is the commit whose message is `unsaved`.

## Unsaved

Unsaved is a version. In Git it is a commit with the message `unsaved`. It sits under the finished version the user started from, and it must look different from finished versions: clearly temporary, clearly unfinished.

How it is written:

- If the user starts editing a **finished** version, the app creates a new Unsaved version: a new commit with message `unsaved`. That finished version can be any version on the variant, not only the latest.
- Save keeps that new work on the same variant. Versions that were already on the variant stay listed.
- If the user selects an **Unsaved** version and keeps editing, the app amends that same commit. It does not create another commit.
- The same Unsaved write happens when they try to open another version, try to open another variant, try to switch user, or try to close the application.
- If there is nothing to write, do not create or amend anything.
- If the write fails, do not complete the switch or the quit. Tell the user and keep Unsaved selected.

Save is different. Save asks for a version name, then turns the current work into a finished version: a commit with that message. Unsaved goes away. The name cannot be empty and cannot be `unsaved`.

The three-dot control on Unsaved is Delete Unsaved, not Create variant. A later variant starts only from a finished version. Deleting Unsaved drops that commit and opens the finished version it came from. That is the only way Unsaved work is thrown away.

Switching and quitting still keep unnamed work as Unsaved so nothing is lost.

## Switching

Switching variant or version is always:

1. If the current files differ from the selected version, write them. Create Unsaved from a finished version, or amend Unsaved if that is what is selected.
2. Open the requested variant or version.
3. Show that content in the editor and preview.

Switching user is the same write, then open the other repository and restore that user's last place.

Do not discard work to make navigation feel instant. Do not silently keep unsaved files on one variant or user while showing another.

## Documents on a version

All documents on a version are HTML files in that commit.

The user can add a cover letter if one is not already there. The user can add as many additional documents as they want. Adding a file on a finished version follows the Unsaved rule above.

Do not create those files in advance. Do not limit how many additional documents a version may hold.

## Search

Search in the sidebar filters variants by name. It does not need to search inside HTML in v1. It does not need to search version messages in v1.

## Export and other machines

A user exported from this app is a Git repository this app can open again as a user.

Opening a remote means importing that whole repository as a user. v1 does not merge the current user with a remote and does not ask anyone to resolve conflicts.

Do not export a private file format that only this app can read. The Git repository is the portable form of a user.

## Language in the interface

Use these words in the UI:

- User
- Switch user
- Variant
- Version
- Unsaved
- Export
- Import

Avoid these words in the UI unless they are in a clearly technical settings area:

- Workspace
- Branch
- Commit
- Repo, unless they are importing a remote they already understand
- Checkout, stash, merge, rebase, HEAD, amend

Settings that open a remote can use normal remote words (remote, clone, import) because the user who does that already lives in that world.
