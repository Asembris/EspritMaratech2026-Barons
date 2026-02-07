Write-Host "Initialisation du Système Multi-Agents (SignLink)..."

$ROOT_DIR = "c:\Users\Omar\Desktop\hachthonb"

# Backend (Port 8000)
Write-Host "Démarrage du Backend (Port 8000)..."
# Using 'python -m uvicorn' to ensure we use the same python environment where dependencies are installed
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\backend'; python -m uvicorn app.main:app --reload --port 8000"

# Frontend (Port 3003)
Write-Host "Démarrage du Frontend (Port 3003)..."
# Using 'npm start' (production build) as it proved more stable. Ensure 'npm run build' was run before if code changed.
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\frontend'; npm start -- -p 3003"

Write-Host "Lancement des serveurs en cours... Veuillez patienter."
Start-Sleep -Seconds 5
Start-Process "http://localhost:3003/"
