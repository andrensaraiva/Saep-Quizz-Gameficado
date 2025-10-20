@echo off
echo ========================================
echo   Quiz SAEP - Instalando Dependencias
echo ========================================
echo.

cd backend
echo Instalando dependencias do backend...
call npm install

if not exist .env (
    echo.
    echo Criando arquivo .env...
    copy .env.example .env
    echo.
    echo IMPORTANTE: Edite o arquivo backend\.env e altere o JWT_SECRET!
)

echo.
echo ========================================
echo   Instalacao Concluida!
echo ========================================
echo.
echo Para iniciar o servidor, execute:
echo   iniciar.ps1 (PowerShell)
echo.
pause
