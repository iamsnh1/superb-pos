# Superb Pos — Release Workflow
How to bump version, build, and publish updates to GitHub so users receive them automatically.

---

## ⚠️ IMPORTANT — Always Build on Windows

**Never build the Windows installer from Mac or Linux.**

`better-sqlite3` is a native C++ addon. It must be compiled on Windows with the exact
Electron version — cross-compilation from Mac produces a `.node` binary that will crash
on Windows.

**The correct workflow:**
- Use **GitHub Actions** (builds on `windows-latest` automatically), OR
- Run `npm run build:win:x64` **on a Windows machine**

---

## 🚀 Recommended: GitHub Actions (Auto-build)

The workflow file is at `.github/workflows/build-windows.yml`.

### Trigger Automatically on Version Tag

```bash
# 1. Bump version
npm run version:patch   # 1.0.0 → 1.0.1

# 2. Commit and tag
git add package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

GitHub Actions will automatically:
- Run on `windows-latest`
- Rebuild `better-sqlite3` for Electron/Windows x64
- Build the `.exe` installer
- Upload to GitHub Releases (if `GH_TOKEN` secret is set)

### Trigger Manually

Go to: **GitHub → Actions → Build & Release Windows → Run workflow**

### Setup: Add GitHub Token Secret

1. Go to: https://github.com/settings/tokens → Generate token with `repo` scope
2. In your repo: **Settings → Secrets → Actions → New repository secret**
   - Name: `GH_TOKEN`
   - Value: your token

---

## 🖥️ Manual Build (on Windows only)

If you must build locally, you **must be on Windows**:

```bash
# Step 1: Bump version
npm run version:patch   # or version:minor / version:major

# Step 2: Build installer (no publish)
npm run build:win:x64
# → Output: release/Superb Pos Setup X.X.X.exe

# Step 3: Publish to GitHub Releases
set GH_TOKEN=your_github_token_here
npm run release
```

---

## What Users See

1. **First install** — Download `Superb Pos Setup X.X.X.exe` from the [Releases](https://github.com/iamsnh1/superb-pos/releases) page.
2. **Installer wizard** — Next → Next → Install → Finish.
3. **Install location** — `C:\Program Files\Superb Pos\`
4. **Shortcuts** — Desktop and Start Menu shortcuts.
5. **Auto-updates** — New releases prompt users to restart and update. Data is preserved.

---

## Quick Reference

| Task | Command |
|------|---------|
| Patch version (1.0.0 → 1.0.1) | `npm run version:patch` |
| Minor version (1.0.0 → 1.1.0) | `npm run version:minor` |
| Major version (1.0.0 → 2.0.0) | `npm run version:major` |
| Build only (Windows machine) | `npm run build:win:x64` |
| Build + publish (Windows machine) | `npm run release` |
| Auto-build via CI | Push a `v*` tag to GitHub |

---

## Troubleshooting

- **Native module crash on Windows** — You built from Mac. Use GitHub Actions instead.
- **`GH_TOKEN is not set`** — Export/set your token before running `npm run release`.
- **`Updates not available`** — Ensure the new version in `package.json` is greater than installed, and the release has both the `.exe` and `latest.yml` uploaded.
- **Antivirus blocking** — Add `Superb Pos` to Windows Defender exclusions. Log is at `%AppData%\superb-pos\superb-pos.log`.
