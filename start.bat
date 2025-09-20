@echo off
echo ========================================
echo  MedSupply Pro - Medical Supply Platform
echo ========================================
echo.

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)
echo ✓ Python found

echo [2/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 16+ from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js found

echo [3/4] Setting up Backend...
cd backend
if not exist "requirements.txt" (
    echo ERROR: requirements.txt not found in backend folder
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    echo Try running: pip install --upgrade pip
    pause
    exit /b 1
)

echo Initializing database...
python app.py initdb
if errorlevel 1 (
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)

echo Starting Backend Server...
start "MedSupply Backend" cmd /k "cd /d %~dp0backend && python app.py run"

echo [4/4] Setting up Frontend...
cd ..\frontend
if not exist "package.json" (
    echo ERROR: package.json not found in frontend folder
    pause
    exit /b 1
)

echo Installing Node.js dependencies...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    echo Try running: npm cache clean --force
    pause
    exit /b 1
)

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "MedSupply Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo  SUCCESS! Both servers are starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Test Accounts:
echo - Facility: facility@example.com / facpass
echo - Vendor:   vendor@example.com / vendorpass
echo.
echo Press any key to close this window...
pause > nul