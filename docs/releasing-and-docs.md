# Releasing and docs hosting

Maintainer notes for shipping desktop builds and publishing the MkDocs site. Product behavior lives in the other documents in this folder.

## Releases

Bump the app version, commit, push the current branch, and push a matching `v*` tag (starts Release CI):

```
./scripts/bump-version.sh --patch    # 0.1.0 -> 0.1.1
./scripts/bump-version.sh --minor   # 0.1.0 -> 0.2.0
./scripts/bump-version.sh --major   # 0.1.0 -> 1.0.0
```

The script keeps `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the git tag in sync. Working tree must be clean.

That runs `.github/workflows/release.yml` for macOS (Apple Silicon), Windows (x64), and Linux (x64). Publish the draft GitHub Release when the jobs finish. Prebuilt binaries then appear on the [Releases](https://github.com/IsmailBiswas/lines/releases) page.

No certificate secrets are required in GitHub for this path. Builds are meant to run with the normal OS warnings:

- **macOS** — ad-hoc signed in CI (`APPLE_SIGNING_IDENTITY=-`). First open: Right-click → Open, or `xattr -cr` on the app to clear quarantine.
- **Windows** — unsigned. SmartScreen: More info → Run anyway.
- **Linux** — `chmod +x` on an AppImage, or install the `.deb`. Distros may show an untrusted-file prompt; there is no SmartScreen equivalent.

Paid Apple/Windows signing is optional and only needed for silent installs without those warnings.

## Docs site

Product documents live in [`docs/`](index.md) and are published with MkDocs Material to GitHub Pages:

[https://ismailbiswas.github.io/lines/](https://ismailbiswas.github.io/lines/)

Preview locally:

```
python3 -m venv .venv-docs
source .venv-docs/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

After the first deploy, enable **GitHub Pages** for the repo: Settings → Pages → Source → **GitHub Actions**.
