# lines

You know the folder: `resume_final.pdf`, `resume_final_v2.pdf`, `resume_final_v2_FINAL.pdf`. I had too many versions, no sane way to manage them, and never quite knew which one I had sent where. Every tool I looked at wanted a new system and quietly locked my files into it. So I built the opposite: a simple, cross-platform resume versioning app where your work stays in repositories you own, and the fear of lock-in does not exist.

Documentation Page: [https://ismailbiswas.github.io/lines/](https://ismailbiswas.github.io/lines/)

Prebuilt binaries for macOS, Windows, and Linux are on the [Releases](https://github.com/IsmailBiswas/lines/releases) page of this repository.

## Build the development version

Needs Rust and Node. The first compile of Git (libgit2) takes a while.

```
npm install
npm run tauri dev
```

## More information

- [Docs site](https://ismailbiswas.github.io/lines/) — product documents published from [`docs/`](docs/index.md)
- [Project initiation](docs/project-initiation.md) — what this is, what v1 includes, and how the folders are meant to work
- [Releasing and docs hosting](docs/releasing-and-docs.md) — version bumps, Release CI, and MkDocs
- [AGENTS.md](AGENTS.md) — rules for changing the product
