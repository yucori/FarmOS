@echo off
chcp 65001 >nul

echo ========================================
echo   FarmOS 전체 서비스 시작
echo ========================================
echo.
echo   FarmOS Backend   : http://localhost:8000
echo   FarmOS Frontend  : http://localhost:5173
echo   Shop Backend     : http://localhost:4000
echo   Shop Frontend    : http://localhost:5174
echo   Backoffice       : http://localhost:5174/admin
echo.

start "FarmOS-Backend" cmd /k "cd /d E:\new_my_study\himedia_FinalProject\FarmOS\backend && uv run python main.py"
start "Shop-Backend" cmd /k "cd /d E:\new_my_study\himedia_FinalProject\FarmOS\shopping_mall\backend && uv run python main.py"
start "FarmOS-Frontend" cmd /k "cd /d E:\new_my_study\himedia_FinalProject\FarmOS\frontend && npm run dev"
start "Shop-Frontend" cmd /k "cd /d E:\new_my_study\himedia_FinalProject\FarmOS\shopping_mall\frontend && npm run dev"

echo 모든 서비스가 시작되었습니다.
pause
