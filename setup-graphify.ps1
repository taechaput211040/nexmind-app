# NEXMIND — Graphify Setup Script
# Run this in PowerShell from anywhere: .\setup-graphify.ps1

$ProjectDir = "$PSScriptRoot"
Set-Location $ProjectDir
Write-Host "`n[1/3] Building knowledge graph..." -ForegroundColor Cyan
graphify .

Write-Host "`n[2/3] Installing Claude Code integration..." -ForegroundColor Cyan
graphify claude install

Write-Host "`n[3/3] Done!" -ForegroundColor Green
Write-Host "  -> Open graphify-out\graph.html in browser for interactive view"
Write-Host "  -> Agents will now read graphify-out\GRAPH_REPORT.md automatically"
Write-Host "  -> Use 'graphify .' in CC anytime to rebuild the graph`n"
