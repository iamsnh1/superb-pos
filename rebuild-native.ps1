# rebuild-native.ps1
# Rebuilds better-sqlite3 for Electron.
# Uses a junction at C:\bld to avoid node-gyp's "spaces in path" bug.

$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
$junctionPath = "C:\bld"

Write-Host ">> Setting up junction at $junctionPath ..."
if (Test-Path $junctionPath) {
    # Remove existing junction (rmdir only removes the link, not the target)
    cmd /c "rmdir `"$junctionPath`"" 2>$null
}
New-Item -ItemType Junction -Path $junctionPath -Target $projectDir -Force | Out-Null
Write-Host "   Junction: $junctionPath -> $projectDir"

Write-Host ">> Getting Electron version..."
$electronVersion = node -p "require('./node_modules/electron/package.json').version"
Write-Host "   Electron: $electronVersion"

Write-Host ">> Running @electron/rebuild via junction path (no spaces)..."
try {
    Set-Location $junctionPath
    npx @electron/rebuild -f -w better-sqlite3 -v $electronVersion --module-dir "$junctionPath\server"
    if ($LASTEXITCODE -ne 0) { throw "@electron/rebuild exited with code $LASTEXITCODE" }
    Write-Host ""
    Write-Host "✅ Native rebuild SUCCESS!" -ForegroundColor Green
} finally {
    Set-Location $projectDir
    Write-Host ">> Cleaning up junction..."
    cmd /c "rmdir `"$junctionPath`"" 2>$null
}
