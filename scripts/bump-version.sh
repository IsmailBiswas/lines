#!/usr/bin/env bash
# Bump app version (package.json, tauri.conf.json, Cargo.toml), commit,
# tag vX.Y.Z, and push the current branch + tag so Release CI can build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage: scripts/bump-version.sh <--major|--minor|--fix>

  --major | -major   1.2.3 -> 2.0.0
  --minor | -minor   1.2.3 -> 1.3.0
  --fix   | -fix     1.2.3 -> 1.2.4

Updates package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml,
commits, creates tag vX.Y.Z, and pushes the current branch and tag.
EOF
}

BUMP=""
for arg in "$@"; do
  case "$arg" in
    --major|-major) [[ -n "$BUMP" ]] && { echo "Pass only one of --major, --minor, --fix." >&2; exit 1; }; BUMP=major ;;
    --minor|-minor) [[ -n "$BUMP" ]] && { echo "Pass only one of --major, --minor, --fix." >&2; exit 1; }; BUMP=minor ;;
    --fix|-fix|-patch) [[ -n "$BUMP" ]] && { echo "Pass only one of --major, --minor, --fix." >&2; exit 1; }; BUMP=fix ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$BUMP" ]]; then
  usage >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Detached HEAD. Check out a branch first." >&2
  exit 1
fi

CURRENT="$(python3 - <<'PY'
import json
from pathlib import Path
print(json.loads(Path("package.json").read_text())["version"])
PY
)"

if [[ ! "$CURRENT" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)([.-].*)?$ ]]; then
  echo "Cannot parse version from package.json: $CURRENT" >&2
  exit 1
fi

MAJOR="${BASH_REMATCH[1]}"
MINOR="${BASH_REMATCH[2]}"
FIX="${BASH_REMATCH[3]}"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; FIX=0 ;;
  minor) MINOR=$((MINOR + 1)); FIX=0 ;;
  fix)   FIX=$((FIX + 1)) ;;
esac

NEXT="${MAJOR}.${MINOR}.${FIX}"
TAG="v${NEXT}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists." >&2
  exit 1
fi

if git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1; then
  echo "Tag $TAG already exists on origin." >&2
  exit 1
fi

python3 - <<PY
import json
import re
from pathlib import Path

version = "${NEXT}"

pkg = Path("package.json")
data = json.loads(pkg.read_text())
data["version"] = version
pkg.write_text(json.dumps(data, indent=2) + "\n")

conf = Path("src-tauri/tauri.conf.json")
cfg = json.loads(conf.read_text())
cfg["version"] = version
conf.write_text(json.dumps(cfg, indent=2) + "\n")

cargo = Path("src-tauri/Cargo.toml")
lines = []
in_package = False
replaced = False
for line in cargo.read_text().splitlines(keepends=True):
    if line.startswith("[package]"):
        in_package = True
    elif line.startswith("[") and in_package:
        in_package = False
    if in_package and line.startswith("version = ") and not replaced:
        lines.append(f'version = "{version}"\n')
        replaced = True
    else:
        lines.append(line)
if not replaced:
    raise SystemExit("Could not update version in src-tauri/Cargo.toml")
cargo.write_text("".join(lines))

lock = Path("src-tauri/Cargo.lock")
if lock.exists():
    text = lock.read_text()
    # Only the root package entry is named resume-tracker.
    pattern = re.compile(
        r'(name = "resume-tracker"\nversion = ")([^"]+)(")',
        re.M,
    )
    updated, count = pattern.subn(rf'\g<1>{version}\g<3>', text, count=1)
    if count:
        lock.write_text(updated)

print(f"{version}")
PY

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
if [[ -f src-tauri/Cargo.lock ]]; then
  git add src-tauri/Cargo.lock
fi

git commit -m "Release ${TAG}"

git tag -a "$TAG" -m "Release ${TAG}"

echo "Pushing branch ${BRANCH} and tag ${TAG}…"
git push -u origin "HEAD:${BRANCH}"
git push origin "$TAG"

echo "Done. ${CURRENT} -> ${NEXT} (${TAG}). Release CI should start from the tag push."
