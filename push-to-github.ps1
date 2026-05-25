# ============================================================
#  NEXMIND App - Push to existing GitHub repo
#  Target: https://github.com/taechaput211040/nexmind-app.git
# ============================================================
#  วิธีใช้:
#    1. เปิด PowerShell
#    2. cd C:\taechapat\AGENT-COMPANY\nexmind-app
#    3. .\push-to-github.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# --- ตั้งค่า ---
$RemoteUrl     = "https://github.com/taechaput211040/nexmind-app.git"
$DefaultBranch = "main"
$CommitMessage = "feat: NEXMIND Command Center - full app sync"
# --------------

Write-Host ""
Write-Host "==> Push NEXMIND -> $RemoteUrl" -ForegroundColor Cyan
Write-Host ""

# 0) ตรวจสอบ folder
if (-not (Test-Path ".\package.json")) {
    Write-Host "[ERROR] ไม่พบ package.json - cd ไปที่ nexmind-app ก่อน" -ForegroundColor Red
    exit 1
}

# 1) ตรวจสอบ git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] ไม่พบ git - ติดตั้ง: winget install --id Git.Git" -ForegroundColor Red
    exit 1
}

# 2) เคลียร์ stale .git lock files (สำคัญ! sandbox ก่อนหน้านี้ทิ้งไว้)
Write-Host "==> เคลียร์ stale git lock..." -ForegroundColor Cyan
foreach ($lock in @(".git\index.lock", ".git\HEAD.lock", ".git\config.lock", ".git\refs\heads\master.lock", ".git\refs\heads\main.lock")) {
    if (Test-Path $lock) {
        Remove-Item $lock -Force
        Write-Host "    ลบ $lock" -ForegroundColor Gray
    }
}

# 3) เช็ค .gitignore ว่ามี .env*
$gitignore = Get-Content .gitignore -Raw -ErrorAction SilentlyContinue
if ($gitignore -notmatch "\.env") {
    Write-Host "==> เพิ่ม .env* เข้า .gitignore" -ForegroundColor Yellow
    Add-Content .gitignore "`n.env*`n"
}

# 4) ลบ .env* ออกจาก git tracking ถ้าเผลอ track ไว้
$trackedEnv = git ls-files | Select-String -Pattern '\.env'
if ($trackedEnv) {
    Write-Host "==> ลบ .env* ออกจาก git index" -ForegroundColor Yellow
    git rm --cached .env* 2>$null
}

# 5) Stage + commit
Write-Host "==> git add -A" -ForegroundColor Cyan
git add -A

$staged = git diff --cached --name-only
if ($staged) {
    Write-Host "==> Committing $(@($staged).Count) file(s)..." -ForegroundColor Cyan
    git commit -m $CommitMessage
} else {
    Write-Host "==> ไม่มีไฟล์ใหม่/เปลี่ยน - ข้าม commit" -ForegroundColor Gray
}

# 6) Rename branch master -> main
$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($currentBranch -ne $DefaultBranch) {
    Write-Host "==> เปลี่ยน branch $currentBranch -> $DefaultBranch" -ForegroundColor Cyan
    git branch -M $DefaultBranch
}

# 7) ตั้งค่า remote origin
$existing = git remote get-url origin 2>$null
if ($existing) {
    if ($existing.Trim() -ne $RemoteUrl) {
        Write-Host "==> อัปเดต remote origin: $existing -> $RemoteUrl" -ForegroundColor Yellow
        git remote set-url origin $RemoteUrl
    } else {
        Write-Host "==> Remote origin ถูกต้องอยู่แล้ว" -ForegroundColor Gray
    }
} else {
    Write-Host "==> เพิ่ม remote origin -> $RemoteUrl" -ForegroundColor Cyan
    git remote add origin $RemoteUrl
}

# 8) Push
Write-Host "==> git push -u origin $DefaultBranch" -ForegroundColor Cyan
Write-Host "    (ถ้า GitHub ถาม credential ให้ใส่ username + Personal Access Token แทน password)" -ForegroundColor Gray
git push -u origin $DefaultBranch

Write-Host ""
Write-Host "[OK] Push สำเร็จ!" -ForegroundColor Green
Write-Host "     -> https://github.com/taechaput211040/nexmind-app" -ForegroundColor Green
Write-Host ""
