# Resume Tracker

A local desktop app for versioned resumes. A user is a Git repository and a complete workspace. Switching user opens another repository. Each named resume line is a variant, which is a Git branch. Each save is a version, which is a Git commit. The files are HTML. PDF is an export.

This repository is in the document stage. Read the docs before adding application code.

## Start here

1. [Project initiation](docs/project-initiation.md) — what this is, what v1 includes, and how the folders are meant to work.
2. [Version model](docs/version-model.md) — how users, variants, versions, and Unsaved map to Git.
3. [User flows](docs/user-flows.md) — the paths the interface has to support.
4. [AGENTS.md](AGENTS.md) — rules for changing the product without lowering the standard.

The rest of the working reference is in [`docs/`](docs/README.md).

`draft.md` is the original sketch. The documents in `docs/` are the live reference.
