@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

rem -- PostgreSQL bin 경로 추가 (버전에 맞게 수정) --
set "PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%"

where python >nul 2>&1
if errorlevel 1 (
  echo [Bootstrap] ERROR: python not found in PATH.
  echo [Bootstrap] Install Python and try again.
  pause
  exit /b 1
)

python "%~dp0bootstrap.py" %*
pause
exit /b %errorlevel%
