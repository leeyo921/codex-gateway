/**
 * OpenCodex Screenshot Capture Utility
 * Captures the main screen using macOS-native Swift CGDisplay API with standard fallback.
 */

import { spawnSync, execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class ScreenshotTaker {
  async capture(): Promise<Buffer> {
    if (process.platform === "win32") {
      return this.windowsCapture();
    }
    try {
      return this.swiftCapture();
    } catch (err: any) {
      console.error("[OpenCodex-Screenshot] Swift CGDisplay capture failed, falling back to screencapture utility:", err.message);
      return this.scCapture();
    }
  }

  private windowsCapture(): Buffer {
    const out = join(tmpdir(), `oc-shot-${Date.now()}.png`);
    const ps = join(tmpdir(), `oc-shot-${Date.now()}.ps1`);
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms,System.Drawing",
      "$b = [System.Windows.Forms.SystemInformation]::VirtualScreen",
      "$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)",
      "$g = [System.Drawing.Graphics]::FromImage($bmp)",
      "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)",
      "$bmp.Save($args[0], [System.Drawing.Imaging.ImageFormat]::Png)",
      "$g.Dispose(); $bmp.Dispose()"
    ].join("\n");
    try {
      writeFileSync(ps, script, "utf-8");
      const r = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps, out],
        { timeout: 10000, windowsHide: true }
      );
      if (r.status !== 0) throw new Error(r.stderr?.toString() || "PowerShell screenshot failed");
      return readFileSync(out);
    } finally {
      try { unlinkSync(ps); } catch {}
      try { unlinkSync(out); } catch {}
    }
  }

  private swiftCapture(): Buffer {
    const out = join(tmpdir(), `oc-shot-${Date.now()}.png`);
    const f = join(tmpdir(), `oc-shot-${Date.now()}.swift`);
    const swiftCode = `import Cocoa
import Foundation
let img = CGDisplayCreateImage(CGMainDisplayID())!
let rep = NSBitmapImageRep(cgImage: img)
let png = rep.representation(using: .png, properties: [:])!
try? png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
`;
    try {
      writeFileSync(f, swiftCode, "utf-8");
      const r = spawnSync("/usr/bin/swift", [f, out], { timeout: 10000 });
      if (r.status !== 0) throw new Error(r.stderr?.toString() || "Swift exit with error status");
      return readFileSync(out);
    } finally {
      try { unlinkSync(f); } catch {}
      try { unlinkSync(out); } catch {}
    }
  }

  private scCapture(): Buffer {
    const out = join(tmpdir(), `oc-shot-sc-${Date.now()}.png`);
    try {
      execSync(`/usr/sbin/screencapture -x -t png "${out}"`, { timeout: 10000 });
      return readFileSync(out);
    } finally {
      try { unlinkSync(out); } catch {}
    }
  }
}
