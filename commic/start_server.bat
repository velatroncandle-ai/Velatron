@echo off
echo ========================================
echo   Servidor Velatron Comics
echo ========================================
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no esta instalado.
    echo Descargalo desde: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Verificando Python...
python --version

echo.
echo [2/3] Instalando dependencias...
pip install -r requirements.txt

echo.
echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo  Servidor iniciado en:
echo  http://localhost:5000
echo.
echo  Panel Admin:
echo  Abre admin.html en tu navegador
echo ========================================
echo.

python server.py

pause
