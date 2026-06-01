/**
 * codex-gateway Operating System Action Performer
 * Performs mouse clicks, smooth drags, scroll events, keyboard typing, key presses,
 * and window management (list and focus) using macOS-native Swift CGEvent APIs.
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface WindowInfo {
  id: number;
  title: string;
  app: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ActionPerformer {
  // ─── Mouse Actions ───

  async click(x: number, y: number, button = "left", clicks = 1) {
    for (let i = 0; i < clicks; i++) {
      this.run("click", [String(x), String(y), button === "right" ? "right" : "left"]);
    }
  }

  async drag(fromX: number, fromY: number, toX: number, toY: number) {
    this.run("drag", [String(fromX), String(fromY), String(toX), String(toY)]);
  }

  async scroll(x: number, y: number, deltaX: number, deltaY: number) {
    this.run("scroll", [String(x), String(y), String(deltaX), String(deltaY)]);
  }

  // ─── Keyboard Actions ───

  async typeText(text: string) {
    this.run("type", [text]);
  }

  async pressKey(key: string) {
    this.run("key", [key]);
  }

  async pageScroll(direction: string, pages = 1) {
    const k = direction === "down" ? "page_down" : "page_up";
    for (let i = 0; i < pages; i++) {
      this.run("key", [k]);
    }
  }

  // ─── Window Management ───

  async getWindows(): Promise<WindowInfo[]> {
    const out = this.run("windows", []);
    return JSON.parse(out);
  }

  async focusWindow(windowId: number) {
    this.run("focus", [String(windowId)]);
  }

  // ─── Script Execution Engine (platform dispatch) ───

  private run(action: string, args: string[]): string {
    if (process.platform === "win32") {
      return this.runWindows(action, args);
    }
    return this.runSwift(action, args);
  }

  private runSwift(action: string, args: string[]): string {
    const script = this.getScript(action, args);
    const scriptPath = join(tmpdir(), `oc-act-${Date.now()}.swift`);
    try {
      writeFileSync(scriptPath, script, "utf-8");
      const r = spawnSync("/usr/bin/swift", [scriptPath], { timeout: 15000, encoding: "utf-8" });
      if (r.status !== 0) {
        const errorMsg = (r.stderr || r.stdout || "Unknown execution error").trim().split("\n").slice(0, 3).join(" | ");
        throw new Error(`Swift Execution Failed: ${errorMsg}`);
      }
      return r.stdout?.trim() || "";
    } finally {
      try { unlinkSync(scriptPath); } catch {}
    }
  }

  private runWindows(action: string, args: string[]): string {
    const script = this.getScriptWin(action, args);
    const scriptPath = join(tmpdir(), `oc-act-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
    try {
      writeFileSync(scriptPath, script, "utf-8");
      const r = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
        { timeout: 15000, encoding: "utf-8", windowsHide: true }
      );
      if (r.status !== 0) {
        const errorMsg = (r.stderr || r.stdout || "Unknown execution error").trim().split("\n").slice(0, 3).join(" | ");
        throw new Error(`PowerShell Execution Failed: ${errorMsg}`);
      }
      return r.stdout?.trim() || "";
    } finally {
      try { unlinkSync(scriptPath); } catch {}
    }
  }

  /**
   * Shared C# P/Invoke block injected via Add-Type. Exposes a static `OC` class
   * with mouse (SetCursorPos/mouse_event), keyboard (SendInput unicode + virtual
   * keys with modifiers) and window helpers (Enum/Foreground). No backticks used
   * so it embeds cleanly in PowerShell.
   */
  private winCSharp(): string {
    return [
      '$sig = @"',
      'using System;',
      'using System.Text;',
      'using System.Runtime.InteropServices;',
      'using System.Collections.Generic;',
      'public class OC {',
      '  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);',
      '  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint data, IntPtr extra);',
      '  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public InputUnion u; }',
      '  [StructLayout(LayoutKind.Explicit)] public struct InputUnion { [FieldOffset(0)] public KEYBDINPUT ki; [FieldOffset(0)] public MOUSEINPUT mi; }',
      '  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr extra; }',
      '  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr extra; }',
      '  [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int cb);',
      '  const uint KU = 0x0002, KUNI = 0x0004, KDOWN = 0;',
      '  static INPUT Key(ushort vk, ushort scan, uint flags) { INPUT i = new INPUT(); i.type = 1; i.u.ki.wVk = vk; i.u.ki.wScan = scan; i.u.ki.dwFlags = flags; return i; }',
      '  public static void TypeUnicode(string s) {',
      '    foreach (char c in s) {',
      '      INPUT[] a = new INPUT[] { Key(0, c, KUNI), Key(0, c, KUNI | KU) };',
      '      SendInput(2, a, Marshal.SizeOf(typeof(INPUT)));',
      '    }',
      '  }',
      '  public static void KeyCombo(ushort[] mods, ushort vk) {',
      '    List<INPUT> seq = new List<INPUT>();',
      '    foreach (ushort m in mods) seq.Add(Key(m, 0, KDOWN));',
      '    seq.Add(Key(vk, 0, KDOWN));',
      '    seq.Add(Key(vk, 0, KU));',
      '    for (int i = mods.Length - 1; i >= 0; i--) seq.Add(Key(mods[i], 0, KU));',
      '    SendInput((uint)seq.Count, seq.ToArray(), Marshal.SizeOf(typeof(INPUT)));',
      '  }',
      '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
      '  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);',
      '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
      '  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint id, uint to, bool attach);',
      '  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();',
      '  public static void ForceForeground(IntPtr h) {',
      '    IntPtr fg = GetForegroundWindow();',
      '    uint pidA, pidB;',
      '    uint tA = GetWindowThreadProcessId(fg, out pidA);',
      '    uint tB = GetWindowThreadProcessId(h, out pidB);',
      '    uint me = GetCurrentThreadId();',
      '    AttachThreadInput(me, tA, true); AttachThreadInput(me, tB, true);',
      '    BringWindowToTop(h); SetForegroundWindow(h);',
      '    AttachThreadInput(me, tA, false); AttachThreadInput(me, tB, false);',
      '  }',
      '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);',
      '  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);',
      '  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);',
      '  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);',
      '  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);',
      '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);',
      '  public delegate bool EnumProc(IntPtr h, IntPtr l);',
      '  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);',
      '  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }',
      '}',
      '"@',
      'Add-Type -TypeDefinition $sig -ReferencedAssemblies System.Drawing | Out-Null'
    ].join("\n");
  }

  /** Map a key token (e.g. "cmd+l", "Return", "page_down") to a PowerShell KeyCombo call. */
  private winKeyCall(key: string): string {
    const VK: Record<string, number> = {
      return: 0x0d, enter: 0x0d, tab: 0x09, escape: 0x1b, esc: 0x1b, space: 0x20,
      backspace: 0x08, delete: 0x2e, up: 0x26, down: 0x28, left: 0x25, right: 0x27,
      home: 0x24, end: 0x23, page_up: 0x21, page_down: 0x22,
      a: 0x41, b: 0x42, c: 0x43, d: 0x44, e: 0x45, f: 0x46, g: 0x47, h: 0x48, i: 0x49,
      j: 0x4a, k: 0x4b, l: 0x4c, m: 0x4d, n: 0x4e, o: 0x4f, p: 0x50, q: 0x51, r: 0x52,
      s: 0x53, t: 0x54, u: 0x55, v: 0x56, w: 0x57, x: 0x58, y: 0x59, z: 0x5a,
      "0": 0x30, "1": 0x31, "2": 0x32, "3": 0x33, "4": 0x34, "5": 0x35, "6": 0x36, "7": 0x37, "8": 0x38, "9": 0x39
    };
    const parts = key.toLowerCase().split("+");
    const lk = parts[parts.length - 1];
    const mods = parts.slice(0, -1);
    const vk = VK[lk] ?? 0;
    const modVks: number[] = [];
    // cmd/command map to Ctrl on Windows (closest equivalent for shortcuts)
    if (mods.includes("ctrl") || mods.includes("control") || mods.includes("cmd") || mods.includes("command")) modVks.push(0x11);
    if (mods.includes("shift")) modVks.push(0x10);
    if (mods.includes("alt") || mods.includes("option")) modVks.push(0x12);
    if (mods.includes("win") || mods.includes("windows") || mods.includes("meta")) modVks.push(0x5b);
    const modsArr = modVks.length ? `[ushort[]]@(${modVks.join(",")})` : "[ushort[]]@()";
    return `[OC]::KeyCombo(${modsArr}, [ushort]${vk})`;
  }

  private getScriptWin(action: string, a: string[]): string {
    const head = this.winCSharp();
    switch (action) {
      case "click": {
        const [x, y, b] = a;
        const isRight = b === "right";
        const down = isRight ? "0x0008" : "0x0002";
        const up = isRight ? "0x0010" : "0x0004";
        return [
          head,
          `[OC]::SetCursorPos(${parseInt(x)}, ${parseInt(y)}) | Out-Null`,
          "Start-Sleep -Milliseconds 20",
          `[OC]::mouse_event(${down}, 0, 0, 0, [IntPtr]::Zero)`,
          `[OC]::mouse_event(${up}, 0, 0, 0, [IntPtr]::Zero)`
        ].join("\n");
      }
      case "drag": {
        const [fx, fy, tx, ty] = a.map((v) => parseInt(v));
        return [
          head,
          `[OC]::SetCursorPos(${fx}, ${fy}) | Out-Null`,
          "Start-Sleep -Milliseconds 30",
          "[OC]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)",
          "$steps = 20",
          "for ($i = 1; $i -le $steps; $i++) {",
          `  $px = [int](${fx} + (${tx} - ${fx}) * $i / $steps)`,
          `  $py = [int](${fy} + (${ty} - ${fy}) * $i / $steps)`,
          "  [OC]::SetCursorPos($px, $py) | Out-Null",
          "  Start-Sleep -Milliseconds 10",
          "}",
          "[OC]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)"
        ].join("\n");
      }
      case "scroll": {
        const dy = parseInt(a[3]) || 0;
        // Wheel delta: one notch = 120. macOS dy>0 = up; Windows positive = up too.
        const wheel = dy * 120;
        return [
          head,
          `$w = ${wheel}`,
          "$ud = [uint32]($w -band 0xffffffff)",
          "[OC]::mouse_event(0x0800, 0, 0, $ud, [IntPtr]::Zero)"
        ].join("\n");
      }
      case "type": {
        // Embed text as UTF-16LE base64 to avoid ALL quoting/space/unicode issues
        // (passing via -File $args splits on spaces and mangles non-ASCII).
        const b64 = Buffer.from(a[0] ?? "", "utf16le").toString("base64");
        return [
          head,
          `$bytes = [Convert]::FromBase64String('${b64}')`,
          "$t = [System.Text.Encoding]::Unicode.GetString($bytes)",
          "if ($t.Length -gt 0) { [OC]::TypeUnicode($t) }"
        ].join("\n");
      }
      case "key": {
        return [head, this.winKeyCall(a[0])].join("\n");
      }
      case "windows": {
        return [
          head,
          "$results = New-Object System.Collections.ArrayList",
          "$cb = [OC+EnumProc]{ param($h, $l)",
          "  if ([OC]::IsWindowVisible($h)) {",
          "    $len = [OC]::GetWindowTextLength($h)",
          "    if ($len -gt 0) {",
          "      $sb = New-Object System.Text.StringBuilder ($len + 1)",
          "      [OC]::GetWindowText($h, $sb, $sb.Capacity) | Out-Null",
          "      $title = $sb.ToString()",
          "      $r = New-Object OC+RECT",
          "      [OC]::GetWindowRect($h, [ref]$r) | Out-Null",
          "      $pid2 = 0",
          "      [OC]::GetWindowThreadProcessId($h, [ref]$pid2) | Out-Null",
          "      $app = ''",
          "      try { $app = (Get-Process -Id $pid2 -ErrorAction Stop).ProcessName } catch {}",
          "      [void]$results.Add([pscustomobject]@{ id = [int64]$h; title = $title; app = $app; x = $r.Left; y = $r.Top; width = ($r.Right - $r.Left); height = ($r.Bottom - $r.Top) })",
          "    }",
          "  }",
          "  return $true",
          "}",
          "[OC]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null",
          "$json = $results | ConvertTo-Json -Compress",
          "if (-not $json) { $json = '[]' }",
          "if ($json[0] -ne '[') { $json = '[' + $json + ']' }",
          "[Console]::Out.Write($json)"
        ].join("\n");
      }
      case "focus": {
        const wid = a[0];
        return [
          head,
          `$h = [IntPtr]([int64]${wid})`,
          "[OC]::ShowWindow($h, 9) | Out-Null",
          "[OC]::ForceForeground($h)"
        ].join("\n");
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private getScript(action: string, a: string[]): string {
    const esc = (s: string) => s.replace(/"/g, '\\"').replace(/\\/g, "\\\\");

    switch (action) {
      case "click": {
        const [x, y, b] = a;
        const isRight = b === "right";
        return [
          "import Cocoa",
          `let p = CGPoint(x: ${x}, y: ${y})`,
          `let btn: CGMouseButton = ${isRight ? ".right" : ".left"}`,
          `CGEvent(mouseEventSource: nil, mouseType: ${isRight ? ".rightMouseDown" : ".leftMouseDown"}, mouseCursorPosition: p, mouseButton: btn)!.post(tap: .cghidEventTap)`,
          `CGEvent(mouseEventSource: nil, mouseType: ${isRight ? ".rightMouseUp" : ".leftMouseUp"}, mouseCursorPosition: p, mouseButton: btn)!.post(tap: .cghidEventTap)`,
        ].join("\n");
      }

      case "drag": {
        const [fx, fy, tx, ty] = a;
        return [
          "import Cocoa",
          `let from = CGPoint(x: ${fx}, y: ${fy})`,
          `let to   = CGPoint(x: ${tx}, y: ${ty})`,
          "CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: from, mouseButton: .left)!.post(tap: .cghidEventTap)",
          "let steps = 20",
          "for i in 1...steps {",
          "  let t = Double(i) / Double(steps)",
          "  let p = CGPoint(x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t)",
          "  CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: p, mouseButton: .left)!.post(tap: .cghidEventTap)",
          "  Thread.sleep(forTimeInterval: 0.01)",
          "}",
          "CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: to, mouseButton: .left)!.post(tap: .cghidEventTap)",
        ].join("\n");
      }

      case "scroll": {
        const [x, y, dx, dy] = a;
        return [
          "import Cocoa",
          `let p = CGPoint(x: ${x}, y: ${y})`,
          `let ev = CGEvent(scrollWheelEvent2Source: nil, units: .line, wheelCount: 2, wheel1: Int32(${dy}), wheel2: Int32(${dx}), wheel3: 0)!`,
          "ev.post(tap: .cghidEventTap)",
        ].join("\n");
      }

      case "type": {
        const t = esc(a[0]);
        return [
          "import Cocoa",
          "let src = CGEventSource(stateID: .combinedSessionState)",
          `for ch in "${t}".utf16 {`,
          "  var c = ch",
          "  let ev = CGEvent(keyboardEventSource: src, virtualKey: 0, keyDown: true)!",
          "  ev.keyboardSetUnicodeString(stringLength: 1, unicodeString: &c)",
          "  ev.post(tap: .cghidEventTap)",
          "  CGEvent(keyboardEventSource: src, virtualKey: 0, keyDown: false)!.post(tap: .cghidEventTap)",
          "}",
        ].join("\n");
      }

      case "key": {
        const k = a[0];
        const K: Record<string, number> = {
          return: 36, enter: 36, tab: 48, escape: 53, esc: 53, space: 49, backspace: 51, delete: 51,
          up: 126, down: 125, left: 123, right: 124, home: 115, end: 119, page_up: 116, page_down: 121,
          a: 0, b: 11, c: 8, d: 2, e: 14, f: 3, g: 5, h: 4, i: 34, j: 38, k: 40, l: 37, m: 46, n: 45,
          o: 31, p: 35, q: 12, r: 15, s: 1, t: 17, u: 32, v: 9, w: 13, x: 7, y: 16, z: 6,
          "0": 29, "1": 18, "2": 19, "3": 20, "4": 21, "5": 22, "6": 23, "7": 24, "8": 25, "9": 26,
        };
        if (k === "page_down" || k === "page_up") {
          const c = k === "page_down" ? 121 : 116;
          return `import Cocoa\nlet src = CGEventSource(stateID: .combinedSessionState)\nCGEvent(keyboardEventSource: src, virtualKey: ${c}, keyDown: true)!.post(tap: .cghidEventTap)\nCGEvent(keyboardEventSource: src, virtualKey: ${c}, keyDown: false)!.post(tap: .cghidEventTap)`;
        }
        const parts = k.toLowerCase().split("+");
        const lk = parts[parts.length - 1];
        const ms = parts.slice(0, -1);
        const kc = K[lk] ?? 0;
        const flags: string[] = [];
        if (ms.includes("cmd") || ms.includes("command")) flags.push(".maskCommand");
        if (ms.includes("ctrl") || ms.includes("control")) flags.push(".maskControl");
        if (ms.includes("alt") || ms.includes("option")) flags.push(".maskAlternate");
        if (ms.includes("shift")) flags.push(".maskShift");

        if (flags.length > 0) {
          return [
            "import Cocoa",
            "let src = CGEventSource(stateID: .combinedSessionState)",
            `let d = CGEvent(keyboardEventSource: src, virtualKey: ${kc}, keyDown: true)!`,
            `d.flags = [${flags.join(", ")}]`,
            "d.post(tap: .cghidEventTap)",
            `CGEvent(keyboardEventSource: src, virtualKey: ${kc}, keyDown: false)!.post(tap: .cghidEventTap)`,
          ].join("\n");
        }
        return [
          "import Cocoa",
          "let src = CGEventSource(stateID: .combinedSessionState)",
          `CGEvent(keyboardEventSource: src, virtualKey: ${kc}, keyDown: true)!.post(tap: .cghidEventTap)`,
          `CGEvent(keyboardEventSource: src, virtualKey: ${kc}, keyDown: false)!.post(tap: .cghidEventTap)`,
        ].join("\n");
      }

      case "windows": {
        return [
          'import Cocoa',
          'let list = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as! [[String: Any]]',
          'let filtered = list.filter { $0["kCGWindowLayer"] as? Int == 0 && $0["kCGWindowOwnerName"] != nil }',
          'let json = filtered.map { w -> [String: Any] in',
          '  let bounds = w["kCGWindowBounds"] as? [String: Double] ?? [:]',
          '  return [',
          '    "id": w["kCGWindowNumber"] as? Int ?? 0,',
          '    "title": w["kCGWindowName"] as? String ?? "",',
          '    "app": w["kCGWindowOwnerName"] as? String ?? "",',
          '    "x": bounds["X"] ?? 0,',
          '    "y": bounds["Y"] ?? 0,',
          '    "width": bounds["Width"] ?? 0,',
          '    "height": bounds["Height"] ?? 0,',
          '  ]',
          '}',
          'if let d = try? JSONSerialization.data(withJSONObject: json, options: []),',
          '   let s = String(data: d, encoding: .utf8) { print(s) }',
        ].join("\n");
      }

      case "focus": {
        const [wid] = a;
        return [
          "import Cocoa",
          `let list = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as! [[String: Any]]`,
          `let target = list.first { $0["kCGWindowNumber"] as? Int == ${wid} }`,
          `if let t = target,`,
          `   let pid = t["kCGWindowOwnerPID"] as? Int,`,
          `   let app = NSRunningApplication(processIdentifier: pid_t(pid)) {`,
          `  app.activate(options: .activateIgnoringOtherApps)`,
          `}`,
        ].join("\n");
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
