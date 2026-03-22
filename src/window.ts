import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ForegroundWindowInfo, WindowBounds, WindowInfo, WindowMatch } from './core/types.js';

const execAsync = promisify(exec);

const runPowerShell = async (script: string): Promise<string> => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`);
    return stdout.trim();
};

const parseJson = <T>(raw: string): T | null => {
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const listWindows = async (): Promise<WindowInfo[]> => {
    const script = `
$wins = Get-Process |
  Where-Object { $_.MainWindowHandle -ne 0 -and -not [string]::IsNullOrWhiteSpace($_.MainWindowTitle) } |
  Select-Object @{Name='title';Expression={$_.MainWindowTitle}}, @{Name='processId';Expression={$_.Id}}
$wins | ConvertTo-Json -Depth 3 -Compress
`;

    const raw = await runPowerShell(script);
    const parsed = parseJson<WindowInfo | WindowInfo[]>(raw);
    if (!parsed) {
        return [];
    }

    return Array.isArray(parsed) ? parsed : [parsed];
};

export const getWindowByTitleRegex = async (titleRegex: string): Promise<WindowMatch | null> => {
    let regex: RegExp;
    try {
        regex = new RegExp(titleRegex, 'i');
    } catch {
        return null;
    }

    const windows = await listWindows();
    return windows.find((windowInfo) => regex.test(windowInfo.title)) ?? null;
};

export const focusWindow = async (titleRegex: string): Promise<boolean> => {
    const win = await getWindowByTitleRegex(titleRegex);
    if (!win) {
        return false;
    }

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
$p = Get-Process -Id ${win.processId} -ErrorAction Stop
$h = $p.MainWindowHandle
if ($h -eq 0) { Write-Output "False"; exit 0 }
[WinApi]::ShowWindowAsync($h, 9) | Out-Null
[WinApi]::SetForegroundWindow($h)
`;

    try {
        const raw = await runPowerShell(script);
        return raw.toLowerCase().includes('true');
    } catch {
        return false;
    }
};

export const getWindowBounds = async (titleRegex: string): Promise<WindowBounds | null> => {
    const win = await getWindowByTitleRegex(titleRegex);
    if (!win) {
        return null;
    }

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
public static class WinApi {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
"@
$p = Get-Process -Id ${win.processId} -ErrorAction Stop
$h = $p.MainWindowHandle
if ($h -eq 0) { exit 1 }
$rect = New-Object RECT
[WinApi]::GetWindowRect($h, [ref]$rect) | Out-Null
[PSCustomObject]@{
  left = $rect.Left
  top = $rect.Top
  right = $rect.Right
  bottom = $rect.Bottom
} | ConvertTo-Json -Compress
`;

    try {
        const raw = await runPowerShell(script);
        return parseJson<WindowBounds>(raw);
    } catch {
        return null;
    }
};

export const getForegroundWindow = async (): Promise<ForegroundWindowInfo | null> => {
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
public static class WinApi {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
$h = [WinApi]::GetForegroundWindow()
if ($h -eq [IntPtr]::Zero) { exit 1 }
$pid = 0
[WinApi]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null
$p = Get-Process -Id $pid -ErrorAction SilentlyContinue
if ($null -eq $p) { exit 1 }
$rect = New-Object RECT
[WinApi]::GetWindowRect($h, [ref]$rect) | Out-Null
[PSCustomObject]@{
  title = $p.MainWindowTitle
  processId = [int]$pid
  bounds = [PSCustomObject]@{
    left = $rect.Left
    top = $rect.Top
    right = $rect.Right
    bottom = $rect.Bottom
  }
} | ConvertTo-Json -Compress
`;

    try {
        const raw = await runPowerShell(script);
        return parseJson<ForegroundWindowInfo>(raw);
    } catch {
        return null;
    }
};
