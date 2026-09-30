# Resume Tracker

A local desktop app for versioned resumes. A user is a Git repository and a complete workspace. Switching user opens another repository. Each named resume line is a variant, which is a Git branch. Each save is a version, which is a Git commit. The files are HTML. PDF is an export.

## Run

```
npm install
npm run tauri dev
```

Needs Rust and Node. The first compile of Git (libgit2) takes a while.

## Docs

Product documents live in [`docs/`](docs/index.md) and are published with MkDocs Material to GitHub Pages:

[https://ismailbiswas.github.io/lines/](https://ismailbiswas.github.io/lines/)

Preview locally:

```
python3 -m venv .venv-docs
source .venv-docs/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

After the first deploy, enable **GitHub Pages** for the repo: Settings → Pages → Source → **GitHub Actions**.

## Start here

1. [Project initiation](docs/project-initiation.md) — what this is, what v1 includes, and how the folders are meant to work.
2. [Version model](docs/version-model.md) — how users, variants, versions, and Unsaved map to Git.
3. [User flows](docs/user-flows.md) — the paths the interface has to support.
4. [AGENTS.md](AGENTS.md) — rules for changing the product without lowering the standard.

`draft.md` is the original sketch. The documents in `docs/` are the live reference.
