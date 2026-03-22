# pc-control-mcp

Windows desktop control MCP server over `stdio` using the official MCP TypeScript SDK.

This server exposes tools to:
- launch/list/kill processes
- move mouse, click, drag, scroll, and type keys/text
- take screenshots and inspect monitors/cursor position
- read/set clipboard text
- read/write/list files
- run shell commands with a basic dangerous-verb guard

## What It Is

`pc-control-mcp` is a local Model Context Protocol (MCP) server that lets an MCP client automate a Windows machine through tool calls.

Transport:
- `stdio` (`@modelcontextprotocol/sdk/server/stdio`)

Entry point:
- [`src/index.ts`](src/index.ts)

## Requirements

- Windows host (tools rely on `user32.dll`, `tasklist`, and PowerShell clipboard commands)
- Node.js 18+ (project currently runs on Node 22 as tested)
- npm

## Install And Build

```bash
npm install
npm run build
```

Run directly:

```bash
node build/index.js
```

Or via package binary:

```bash
npx pc-control-mcp
```

## How It Works

The server registers `tools/list` and `tools/call` handlers and returns MCP-compatible content payloads:

- successful result:
  - `{ content: [{ type: "text", text: "..." }] }`
- error result:
  - `{ content: [{ type: "text", text: "Error: ..." }], isError: true }`

Most non-string results are JSON-stringified before returning.

## Tool Reference

Source of truth: [`src/index.ts`](src/index.ts)

### Process Tools

- `process_launch`
  - args: `{ command: string, args?: string[], cwd?: string }`
  - behavior: detached spawn (`stdio: ignore`, `windowsHide: false`), returns spawned PID
- `process_list`
  - args: `{}`
  - behavior: parses `tasklist /fo csv /nh`
- `process_kill`
  - args: `{ pid: number }`
  - behavior: tries `SIGTERM`, then `SIGKILL`

Implementation: [`src/process.ts`](src/process.ts)

### Window Tools

- `window_list`
  - args: `{}`
  - behavior: enumerate visible windows and return title + processId
- `window_find`
  - args: `{ titleRegex: string }`
  - behavior: find first visible window whose title matches regex (case-insensitive)
- `window_focus`
  - args: `{ titleRegex: string }`
  - behavior: brings matching window to foreground
- `window_bounds`
  - args: `{ titleRegex: string }`
  - behavior: returns `{ left, top, right, bottom }`

Implementation: [`src/window.ts`](src/window.ts)

### Input Tools

- `input_mouse_move_delta`
  - args: `{ dx: number, dy: number }`
  - behavior: relative mouse movement
- `input_click`
  - args: `{ button: "left" | "right" | "middle" }`
- `input_drag`
  - args: `{ dx: number, dy: number, button: "left" | "right" | "middle" }`
  - behavior: press+move+release in one call
- `input_scroll`
  - args: `{ delta: number }`
- `input_key_press_scan`
  - args: `{ key: number }`
  - behavior: virtual key -> scan code -> key down/up
- `input_type_text`
  - args: `{ text: string }`
  - behavior: Unicode key events (`KEYEVENTF_UNICODE`)

Implementation: [`src/input.ts`](src/input.ts)

### Screen Tools

- `screen_screenshot`
  - args: `{ monitorId?: string }`
  - returns: base64 PNG string
- `screen_get_monitors`
  - args: `{}`
  - returns: monitor metadata from `screenshot-desktop`
- `screen_get_cursor_pos`
  - args: `{}`
  - returns: `{ x, y } | null`

Implementation: [`src/system.ts`](src/system.ts)

### Clipboard Tools

- `clipboard_get`
  - args: `{}`
  - behavior: `powershell -command "Get-Clipboard"`
- `clipboard_set`
  - args: `{ text: string }`
  - behavior: `Set-Clipboard`

Implementation: [`src/system.ts`](src/system.ts)

### File System Tools

- `fs_exists`
  - args: `{ path: string }`
- `fs_read`
  - args: `{ path: string }`
- `fs_write`
  - args: `{ path: string, data: string }`
- `fs_list`
  - args: `{ path: string }`
  - returns: `{ name, isDirectory }[]`

Implementation: [`src/system.ts`](src/system.ts)

### Command Tool

- `cmd_run`
  - args: `{ command: string, requireConfirmation?: boolean }`
  - behavior:
    - blocks command if it contains one of:
      - `rm`, `del`, `format`, `diskpart`, `wget`, `curl`, `invoke-webrequest`
    - only blocks when `requireConfirmation !== false`
    - executes with 30s timeout otherwise

Implementation: [`src/cmd.ts`](src/cmd.ts)

## Example MCP Calls

List tools:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

Launch Paint:

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"process_launch","arguments":{"command":"mspaint"}}}
```

Move and click:

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"input_mouse_move_delta","arguments":{"dx":400,"dy":300}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"input_click","arguments":{"button":"left"}}}
```

Take screenshot:

```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"screen_screenshot","arguments":{}}}
```

## Local Smoke Test

Simple tool registration check:

```bash
node test-mcp.js
```

File: [`test-mcp.js`](test-mcp.js)

## Known Limitations / Issues

- Window APIs currently error in some environments with:
  - `Error: Unexpected EnumWindowsProc type, expected <callback> * type`
  - affected tools: `window_list`, `window_find`, `window_focus`, `window_bounds`
- Input is relative (`dx`/`dy`) and depends on current cursor location and focused window; drawing automation can be flaky if focus changes.
- `cmd_run` guard is substring-based and can be bypassed by obfuscation; it is not a full security sandbox.
- `fs_*` and `cmd_run` provide broad host access. Use only in trusted local contexts.

## Security Notes

This server can control input devices, execute commands, and read/write files. Treat it as high-trust software.

Recommended:
- run only on machines you control
- do not expose to untrusted clients
- consider adding explicit allowlists for commands and paths before production use

## Project Structure

- [`src/index.ts`](src/index.ts): MCP server, tool registration, dispatch
- [`src/process.ts`](src/process.ts): process management tools
- [`src/window.ts`](src/window.ts): window enumeration/focus/bounds
- [`src/input.ts`](src/input.ts): mouse/keyboard injection
- [`src/system.ts`](src/system.ts): screenshot/clipboard/fs utilities
- [`src/cmd.ts`](src/cmd.ts): shell command execution
- [`src/win32.ts`](src/win32.ts): Win32 FFI definitions


