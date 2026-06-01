#!/bin/bash
#
# codex-gateway 一键启动器（macOS 双击即可运行）
# One-click launcher for codex-gateway on macOS — just double-click this file.
#
# 它会自动：检查 Node.js → 安装依赖 → 编译 → 启动网关 → 打开控制面板
# It will: check Node.js -> install deps -> build -> start gateway -> open dashboard
#

set -e
cd "$(dirname "$0")"

echo "============================================"
echo "   codex-gateway 启动器 / Launcher"
echo "============================================"
echo ""

# 1) 检查 Node.js / Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "⚠️  未检测到 Node.js / Node.js not found."
  if command -v brew >/dev/null 2>&1; then
    echo "👉 正在用 Homebrew 安装 Node.js... / Installing Node.js via Homebrew..."
    brew install node
  else
    echo ""
    echo "请先安装 Node.js（推荐 LTS 版）后再双击本文件。"
    echo "Please install Node.js (LTS) first, then double-click this file again."
    echo ""
    echo "下载地址 / Download: https://nodejs.org/zh-cn/download"
    echo ""
    echo "（按回车键关闭窗口 / Press Enter to close）"
    read -r
    exit 1
  fi
fi

echo "✅ Node.js: $(node -v)"
echo ""

# 2) 安装依赖（仅首次或缺失时）/ Install deps (first run only)
if [ ! -d "node_modules" ]; then
  echo "📦 首次运行，正在安装依赖... / First run, installing dependencies..."
  npm install
  echo ""
fi

# 3) 编译 TypeScript / Build
if [ ! -f "dist/server.js" ] || [ "src/server.ts" -nt "dist/server.js" ]; then
  echo "🔨 正在编译... / Building..."
  npm run build
  echo ""
fi

# 4) 启动 / Start
echo "🚀 正在启动 codex-gateway 网关... / Starting codex-gateway gateway..."
echo "   控制面板将自动打开 / Dashboard will open automatically:"
echo "   http://localhost:8765/dashboard"
echo ""
echo "   （保持此窗口开启即代表服务运行中；关闭窗口将停止服务）"
echo "   (Keep this window open to keep running; closing it stops the service.)"
echo ""

# 延迟打开浏览器，确保服务已监听端口 / Open dashboard shortly after start
( sleep 2 && open "http://localhost:8765/dashboard" ) &

npm start
