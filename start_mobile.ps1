# Get IPv4 Address (Wi-Fi or Ethernet)
$ipv4 = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*" -and $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress

if (-not $ipv4) {
    $ipv4 = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress
}

Write-Host "MOBILE MODE STARTING..." -ForegroundColor Cyan
Write-Host "Your Local IP: $ipv4" -ForegroundColor Green

# Kill existing processes
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM python.exe /T 2>$null
taskkill /F /IM uvicorn.exe /T 2>$null

# Try to open Firewall Ports (Requires Admin usually, but harmless to try)
Write-Host "Attempting to open Firewall ports 3003 and 8000..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Allow NextJS Mobile" -Direction Inbound -LocalPort 3003 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Allow FastAPI Mobile" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
} catch {
    Write-Host "Could not auto-add Firewall rules. If mobile connection fails, check Windows Firewall." -ForegroundColor Red
}

# Set Environment Variable for Next.js
$env:NEXT_PUBLIC_API_URL = "http://$ipv4:8000"

# Start Backend
Start-Process -FilePath "uvicorn" -ArgumentList "app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory "backend" -NoNewWindow
Write-Host "Backend started on 0.0.0.0:8000" -ForegroundColor Green

# Start Frontend
# explicit .cmd for Windows compatibility
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- -p 3003 -H 0.0.0.0" -WorkingDirectory "frontend" -NoNewWindow
Write-Host "Frontend started on 0.0.0.0:3003" -ForegroundColor Green

Write-Host "READY! On your mobile, allow access if Firewall asks." -ForegroundColor Magenta
Write-Host "GO TO: http://$ipv4:3003" -ForegroundColor Cyan
