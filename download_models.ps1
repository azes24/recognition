# Face Lock — Model Download Script
# Downloads face-api.js model weights to the /models directory.
#
# Usage: Right-click → Run with PowerShell
# Or from terminal: powershell -ExecutionPolicy Bypass -File download_models.ps1

$ErrorActionPreference = "Stop"

$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$modelDir = Join-Path $PSScriptRoot "models"

# Create models directory
if (-not (Test-Path $modelDir)) {
    New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
    Write-Host "[+] Created models directory: $modelDir" -ForegroundColor Green
}

# Model files required for Face Lock
$files = @(
    # SSD MobileNet v1 — Face Detection
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",

    # Face Landmark 68 — Facial Landmarks
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",

    # Face Recognition Net — 128-dim Embeddings
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

$total = $files.Count
$current = 0
$failed = @()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Face Lock — Model Weight Downloader" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Downloading $total model files from face-api.js..." -ForegroundColor White
Write-Host ""

foreach ($file in $files) {
    $current++
    $url = "$baseUrl/$file"
    $outPath = Join-Path $modelDir $file

    Write-Host "[$current/$total] Downloading $file..." -NoNewline

    try {
        # Use TLS 1.2
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing
        $size = (Get-Item $outPath).Length
        $sizeKB = [math]::Round($size / 1024, 1)
        Write-Host (' OK ({0} KB)' -f $sizeKB) -ForegroundColor Green
    }
    catch {
        Write-Host ' FAILED' -ForegroundColor Red
        Write-Host ('  Error: {0}' -f $_.Exception.Message) -ForegroundColor Red
        $failed += $file
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($failed.Count -eq 0) {
    Write-Host "All $total model files downloaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Models saved to: $modelDir" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Start the PHP server:  php -S localhost:8000" -ForegroundColor White
    Write-Host "  2. Open browser:          http://localhost:8000" -ForegroundColor White
    Write-Host "  3. Go to Register page to upload face images" -ForegroundColor White
}
else {
    Write-Host "$($failed.Count) file(s) failed to download:" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "  - $f" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
