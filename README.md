# codex-gateway 🚀

[English](#english) | [简体中文](#简体中文)

<p align="center">
  <img src="preview.png" alt="codex-gateway Dashboard" width="800">
</p>

---

# English
This project is forked from OpenCodex, with additional improvements for usability, Windows support, provider management, and Vision Bridge configuration.

**codex-gateway** is a plug-and-play local gateway that unlocks Codex Desktop for third-party APIs, featuring a premium web dashboard, custom Computer Use engine, and Vision Bridge for text-only models.

## 🌟 Key Features

* **Zero-Config Setup**: Start the server, it auto-patches `~/.codex/config.toml` with backups. No CLI, no manual editing.
* **Premium Web Dashboard** (`http://localhost:8765/dashboard`):
  * 🌐 Bilingual (EN/中文) with instant switch
  * 🔑 API key & endpoint management
  * 📝 Add/delete custom models, toggle visibility in Codex
  * 📡 Live SSE log streaming
  * 🚀 One-click Codex restart
  * ↺ One-click reset to native Codex
* **Custom Computer Use Engine**:
  * 🖱️ Native macOS mouse/keyboard/window control via CGEvent
  * 📸 Screenshot capture with `sips` compression (1200px)
* **Vision Bridge**:
  * 👁️ For text-only models (DeepSeek, etc.)
  * Automatically compresses screenshots, describes via multimodal model, injects description into prompt
  * Supports any OpenAI-compatible vision model (configurable endpoint, model, API key)

## 🚀 Quick Start

### Option 1 — Download Pre-built Binary (No Node.js Required)

Go to the [**Releases page**](https://github.com/leeyo921/codex-gateway/releases/latest) and download the binary for your platform:

| Platform | File |
|---|---|
| Windows (x64) | `codex-gateway-windows-x64.exe` |
| macOS (Apple Silicon) | `codex-gateway-macos-arm64` |

**Windows**: double-click the `.exe`, or run it from the terminal:
```bat
codex-gateway-windows-x64.exe
```

**macOS**: make it executable, then run:
```bash
chmod +x codex-gateway-macos-arm64
./codex-gateway-macos-arm64
```

The server starts and opens the dashboard in your browser automatically.

---

### Option 2 — Run from Source (Node.js v18+)

```bash
git clone https://github.com/leeyo921/codex-gateway.git
cd codex-gateway
npm install
npm start
```

---

After starting, open [http://localhost:8765/dashboard](http://localhost:8765/dashboard), add your API key and model names, click save — done.

---

# 简体中文
本项目 fork 自 OpenCodex，并在此基础上针对易用性、Windows 支持、Provider 管理和 Vision Bridge 配置做了改造。

**codex-gateway** 是一款即插即用的本地网关，为 Codex Desktop 解锁第三方 API。配备高颜值 Web 控制台、自研 Computer Use 引擎，以及让纯文本模型也能看图操作的 Vision Bridge。

## 🌟 核心特性

* **零配置启动**：启动后自动修补 `~/.codex/config.toml`，无需任何操作。
* **高颜值 Web 控制台**（`http://localhost:8765/dashboard`）：
  * 🌐 中英文一键切换
  * 🔑 图形化管理 API Key 和接口地址
  * 📝 自由增删模型，勾选控制哪些显示在 Codex
  * 📡 实时 SSE 日志流
  * 🚀 一键重启 Codex
  * ↺ 一键还原原生 Codex
* **自研 Computer Use 引擎**：
  * 🖱️ macOS 原生鼠标/键盘/窗口控制（CGEvent）
  * 📸 截图自动 `sips` 压缩至 1200px
* **Vision Bridge 视觉降级**：
  * 👁️ 纯文本模型（DeepSeek 等）也能跑 Computer Use
  * 自动压缩截图 → 多模态模型描述 → 注入文字到 Prompt
  * 支持任意 OpenAI 兼容的多模态模型（可配接口、模型名、Key）

## 🚀 快速上手

### 方式一 — 下载预编译版本（无需安装 Node.js）

前往 [**Releases 页面**](https://github.com/leeyo921/codex-gateway/releases/latest) 下载对应平台的文件：

| 平台 | 文件 |
|---|---|
| Windows (x64) | `codex-gateway-windows-x64.exe` |
| macOS（Apple Silicon） | `codex-gateway-macos-arm64` |

**Windows**：双击 `.exe` 直接运行，或在终端执行：
```bat
codex-gateway-windows-x64.exe
```

**macOS**：先赋予执行权限，再运行：
```bash
chmod +x codex-gateway-macos-arm64
./codex-gateway-macos-arm64
```

启动后浏览器自动打开控制台。

---

### 方式二 — 源码运行（需要 Node.js v18+）

```bash
git clone https://github.com/leeyo921/codex-gateway.git
cd codex-gateway
npm install
npm start
```

---

启动后打开 [http://localhost:8765/dashboard](http://localhost:8765/dashboard)，填写 API Key 和模型名，保存即可使用。
