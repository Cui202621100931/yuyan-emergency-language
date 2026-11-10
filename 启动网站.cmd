@echo off
chcp 65001 >nul
title 语安 · 应急语言服务
cd /d "%~dp0"

set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE=C:\Users\85282\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE%" if /i not "%NODE%"=="node" (
  echo 未找到 Node.js。请安装 Node 20+，或修改本脚本里的 NODE 路径。
  pause
  exit /b 1
)

echo.
echo   ============================================
echo    语安 · 应急语言服务
echo    访问地址： http://127.0.0.1:8080
echo    关闭本窗口即可停止服务
echo   ============================================
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:8080'"

"%NODE%" server\index.js

echo.
echo 服务已停止。
echo 如果上方提示 EADDRINUSE，说明网站已经在运行，直接访问 http://127.0.0.1:8080 即可。
pause
