# lines

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

## Releases

Push a version tag to build desktop installers and attach them to a **draft** GitHub Release:

```
git tag v0.1.0
git push origin v0.1.0
```

That runs `.github/workflows/release.yml` for macOS (Apple Silicon), Windows (x64), and Linux (x64). The tag version is synced into `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` for that build. Publish the draft when you are ready.

No certificate secrets are required in GitHub for this path. Builds are meant to run with the normal OS warnings:

- **macOS** — ad-hoc signed in CI (`APPLE_SIGNING_IDENTITY=-`). First open: Right-click → Open, or `xattr -cr` on the app to clear quarantine.
- **Windows** — unsigned. SmartScreen: More info → Run anyway.
- **Linux** — `chmod +x` on an AppImage, or install the `.deb`. Distros may show an untrusted-file prompt; there is no SmartScreen equivalent.

Paid Apple/Windows signing is optional and only needed for silent installs without those warnings.

## Start here

1. [Project initiation](docs/project-initiation.md) — what this is, what v1 includes, and how the folders are meant to work.
2. [Version model](docs/version-model.md) — how users, variants, versions, and Unsaved map to Git.
3. [User flows](docs/user-flows.md) — the paths the interface has to support.
4. [AGENTS.md](AGENTS.md) — rules for changing the product without lowering the standard.

`draft.md` is the original sketch. The documents in `docs/` are the live reference.
