@echo off
chcp 65001 >nul
setlocal
REM OpenCodex 一键启动器（Windows 双击即可运行）
REM One-click launcher for OpenCodex on Windows.
cd /d "%~dp0"

echo ============================================
echo    OpenCodex 启动器 / Launcher (Windows)
echo ============================================
echo.

REM 1) 检查 Node.js / Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [!] 未检测到 Node.js / Node.js not found.
  echo     请先安装 Node.js LTS 后再双击本文件。
  echo     Install Node.js LTS first: https://nodejs.org/zh-cn/download
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v

REM 1b) 把 node.exe 所在目录加入 PATH，确保 npm 一定可用
REM     Add node.exe directory to PATH so npm.cmd next to it resolves.
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
for %%i in ("%NODE_EXE%") do set "NODE_DIR=%%~dpi"
set "PATH=%NODE_DIR%;%PATH%"

where npm >nul 2>nul
if errorlevel 1 (
  echo [!] 在 node 目录下仍未找到 npm / npm not found next to node.exe.
  echo     Node 目录 / Node dir: %NODE_DIR%
  echo.
  pause
  exit /b 1
)

REM 2) 安装依赖（仅首次）/ Install deps (first run only)
if not exist "node_modules" (
  echo [*] 首次运行，正在安装依赖... / Installing dependencies...
  call npm install
  echo.
)

REM 3) 编译 / Build
if not exist "dist\server.js" (
  echo [*] 正在编译... / Building...
  call npm run build
  echo.
)

REM 4) 启动 / Start
echo [*] 正在启动 OpenCodex 网关... / Starting gateway...
echo     控制面板 / Dashboard: http://localhost:8765/dashboard
echo     ^(保持此窗口开启即代表服务运行中 / Keep this window open^)
echo.
start "" "http://localhost:8765/dashboard"
call npm start
pause
