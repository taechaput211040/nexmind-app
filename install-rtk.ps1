# ============================================================
#  RTK Installer for NEXMIND (Native Windows)
#  https://github.com/rtk-ai/rtk
#
#  ติดตั้ง rtk.exe + ตั้งค่า Claude Code hook
#  หลังติดตั้งเสร็จ ทุก Claude Code session (รวม /api/claude-code
#  และ /api/research ของ NEXMIND) จะใช้ RTK อัตโนมัติ
# ============================================================
#  วิธีใช้:
#    1. เปิด PowerShell
#    2. .\install-rtk.ps1
#    3. ถ้า block: powershell -ExecutionPolicy Bypass -File .\install-rtk.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# --- ตั้งค่า ---
$InstallDir   = "$env:USERPROFILE\.local\bin"
$RtkExePath   = "$InstallDir\rtk.exe"
$ZipUrl       = "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip"
$TmpZip       = "$env:TEMP\rtk-install.zip"
$TmpExtract   = "$env:TEMP\rtk-extract"
# --------------

Write-Host ""
Write-Host "==> RTK Installer for NEXMIND" -ForegroundColor Cyan
Write-Host "    Target: $RtkExePath" -ForegroundColor Cyan
Write-Host ""

# 0) เช็คว่ามี rtk ติดตั้งอยู่แล้วยัง
$skipInstall = $false
$existing = Get-Command rtk -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "==> พบ rtk อยู่แล้วที่: $($existing.Source)" -ForegroundColor Yellow
    $ver = & rtk --version 2>&1
    Write-Host "    Version: $ver" -ForegroundColor Gray
    Write-Host ""
    $reinstall = Read-Host "ต้องการ reinstall ทับ? (y/N)"
    if ($reinstall -ne 'y' -and $reinstall -ne 'Y') {
        Write-Host "    ข้าม install — ไปขั้นตอน Claude Code hook..." -ForegroundColor Gray
        $skipInstall = $true
    }
}

if (-not $skipInstall) {
    # 1) สร้าง install directory
    if (-not (Test-Path $InstallDir)) {
        Write-Host "==> สร้าง folder: $InstallDir" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # 2) ดาวน์โหลด zip
    Write-Host "==> ดาวน์โหลด RTK ล่าสุดจาก GitHub..." -ForegroundColor Cyan
    Write-Host "    $ZipUrl" -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $TmpZip -UseBasicParsing
        $size = (Get-Item $TmpZip).Length / 1MB
        Write-Host ("    Downloaded {0:N2} MB" -f $size) -ForegroundColor Gray
    } catch {
        Write-Host "[ERROR] ดาวน์โหลดล้มเหลว: $_" -ForegroundColor Red
        Write-Host "        ตรวจ internet หรือดาวน์โหลด manual จาก:" -ForegroundColor Yellow
        Write-Host "        https://github.com/rtk-ai/rtk/releases" -ForegroundColor Yellow
        exit 1
    }

    # 3) แตก zip
    Write-Host "==> แตก zip..." -ForegroundColor Cyan
    if (Test-Path $TmpExtract) { Remove-Item $TmpExtract -Recurse -Force }
    Expand-Archive -Path $TmpZip -DestinationPath $TmpExtract -Force

    # หา rtk.exe ใน folder ที่แตกออกมา
    $extractedExe = Get-ChildItem -Path $TmpExtract -Filter "rtk.exe" -Recurse | Select-Object -First 1
    if (-not $extractedExe) {
        Write-Host "[ERROR] ไม่พบ rtk.exe ใน zip" -ForegroundColor Red
        exit 1
    }

    # 4) ย้ายไป install dir
    Write-Host "==> ติดตั้ง rtk.exe ไปที่ $RtkExePath" -ForegroundColor Cyan
    Copy-Item -Path $extractedExe.FullName -Destination $RtkExePath -Force

    # cleanup
    Remove-Item $TmpZip -Force
    Remove-Item $TmpExtract -Recurse -Force

    # 5) เพิ่ม install dir เข้า PATH (user-level)
    Write-Host "==> ตรวจ PATH..." -ForegroundColor Cyan
    $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -notlike "*$InstallDir*") {
        Write-Host "    เพิ่ม $InstallDir เข้า user PATH" -ForegroundColor Cyan
        $newPath = if ($userPath) { "$userPath;$InstallDir" } else { $InstallDir }
        [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
        # อัปเดต PATH ของ session ปัจจุบันด้วย
        $env:PATH = "$env:PATH;$InstallDir"
        Write-Host "    [!] PowerShell session ใหม่จะมี rtk บน PATH อัตโนมัติ" -ForegroundColor Yellow
        Write-Host "    [!] หรือ restart terminal นี้ก่อนใช้ในที่อื่น" -ForegroundColor Yellow
    } else {
        Write-Host "    PATH มี $InstallDir อยู่แล้ว" -ForegroundColor Gray
    }

    # 6) verify
    Write-Host "==> ตรวจ install..." -ForegroundColor Cyan
    $rtkVer = & $RtkExePath --version 2>&1
    Write-Host "    $rtkVer" -ForegroundColor Green
}

# 7) ตั้งค่า Claude Code hook
Write-Host ""
Write-Host "==> ตั้งค่า Claude Code integration..." -ForegroundColor Cyan
Write-Host "    (Native Windows ไม่รองรับ auto-rewrite hook — จะใช้ CLAUDE.md injection mode)" -ForegroundColor Gray

$rtkBin = if (Test-Path $RtkExePath) { $RtkExePath } else { "rtk" }

try {
    & $rtkBin init -g
    Write-Host "    [OK] Claude Code integration พร้อมใช้" -ForegroundColor Green
} catch {
    Write-Host "[WARN] rtk init -g ล้มเหลว: $_" -ForegroundColor Yellow
    Write-Host "       ลองรันด้วยมือ: rtk init -g" -ForegroundColor Yellow
}

# 8) ทดสอบ command
Write-Host ""
Write-Host "==> ทดสอบ rtk commands..." -ForegroundColor Cyan
try {
    $gainOutput = & $rtkBin gain 2>&1
    Write-Host "    rtk gain ทำงานได้ ✓" -ForegroundColor Green
} catch {
    Write-Host "[WARN] rtk gain ล้มเหลว" -ForegroundColor Yellow
}

# 9) สรุป
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  [OK] RTK ติดตั้งเสร็จเรียบร้อย" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "ขั้นตอนถัดไป:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. ปิด/เปิด terminal ใหม่ (เพื่อให้ PATH update)" -ForegroundColor White
Write-Host ""
Write-Host "  2. ปิด/เปิด Claude Code CLI (เพื่อโหลด hook ใหม่)" -ForegroundColor White
Write-Host ""
Write-Host "  3. ทดสอบ: " -ForegroundColor White
Write-Host "       rtk --version" -ForegroundColor Gray
Write-Host "       rtk git status" -ForegroundColor Gray
Write-Host "       rtk ls ." -ForegroundColor Gray
Write-Host ""
Write-Host "  4. ดูสถิติประหยัด token:" -ForegroundColor White
Write-Host "       rtk gain          # สรุป" -ForegroundColor Gray
Write-Host "       rtk gain --graph  # graph 30 วัน" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. ถอนการติดตั้ง (ถ้าไม่ชอบ):" -ForegroundColor White
Write-Host "       rtk init -g --uninstall" -ForegroundColor Gray
Write-Host "       Remove-Item $RtkExePath" -ForegroundColor Gray
Write-Host ""
Write-Host "หมายเหตุ:" -ForegroundColor Yellow
Write-Host "  - Native Windows: ใช้ CLAUDE.md injection (Claude จะ 'พยายาม' ใช้ rtk เอง)"
Write-Host "  - WSL: ใช้ hook auto-rewrite เต็มที่ (แนะนำถ้าต้องการประหยัดสูงสุด)"
Write-Host "  - NEXMIND /api/claude-code spawn Claude Code subprocess — ได้ประโยชน์ทันที"
Write-Host ""
