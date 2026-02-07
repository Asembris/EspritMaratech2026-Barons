Write-Host "Initialisation du Système Multi-Agents..."

$ROOT_DIR = "c:\Users\Omar\Desktop\hachthonb"

# Backend
Write-Host "Démarrage du Backend (Port 8001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR'; .\venv\Scripts\Activate.ps1; cd backend; pip install langchain langchain-community langchain-openai lucide-react; uvicorn app.main:app --reload --port 8001"

# Frontend
Write-Host "Démarrage du Frontend (Port 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR'; cd frontend; npm run dev"

Write-Host "Les serveurs démarrent..."
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000/"
