# pc-control-mcp

Real-time MCP desktop-control server for Windows.

This server is now strict single-step control:

- mouse
- keyboard
- screenshot observation

No programmatic app/process/window control is exposed in the MCP tool API.

## Tool Model

## Core tools

- `server_info`
- `screen_get_monitors`
- `session_start`
- `session_observe`
- `session_step`
- `session_end`
- `safety_set_emergency_key`
- `safety_get_emergency_key`

## `session_step` actions

- `move_mouse`
- `click`
- `mouse_down`
- `mouse_up`
- `drag_move`
- `scroll`
- `key_press`
- `type_text`

Every `session_step` requires the latest `observationId` from the previous observation.

## Screenshot Artifact Location

Session observations with screenshots are also persisted as PNG files outside the repo:

- default: `%USERPROFILE%\\Pictures\\pc-control-mcp\\session-*`
- optional override: set `MCP_SCREENSHOT_DIR` to a custom absolute path

On a new `session_start` (when no other sessions are active), the screenshot workspace is auto-cleared.

## Real-time Loop

1. `session_start`
2. `session_observe`
3. `session_step` (one action only)
4. consume returned observation
5. repeat 2-4
6. `session_end`

## Build

```bash
npm install
npm run build
```

## Run Local (stdio)

`stdio` mode is available for local MCP clients that spawn the process:

```bash
MCP_TRANSPORT=stdio npm start
```

Equivalent:

```bash
MCP_TRANSPORT=stdio node build/index.js
```

## Run Over LAN (HTTP Streamable MCP)

Default `npm start` mode is HTTP.

Using shell environment variables:

```bash
set MCP_TRANSPORT=http
set MCP_HTTP_HOST=0.0.0.0
set MCP_HTTP_PORT=3333
set MCP_AUTH_TOKEN=change-me-strong-token
npm start
```

Using `.env` file (loaded automatically at startup):

```env
MCP_TRANSPORT=http
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3333
MCP_AUTH_TOKEN=change-me-strong-token
MCP_SCREENSHOT_DIR=C:\\Users\\YourUser\\Pictures\\pc-control-mcp
```

Health check:

```bash
curl http://127.0.0.1:3333/health
```

From another machine on the same LAN, connect MCP client to:

- MCP endpoint: `http://<host-ip>:3333/mcp`
- Auth header: `Authorization: Bearer <MCP_AUTH_TOKEN>`

Example IP lookup (Windows):

```bash
ipconfig
```

## Firewall

Open inbound TCP port (example `3333`) on the host machine.

PowerShell (run as admin):

```powershell
New-NetFirewallRule -DisplayName "pc-control-mcp" -Direction Inbound -Protocol TCP -LocalPort 3333 -Action Allow
```

## Security Notes

This server can control local mouse/keyboard and read the screen.

- Keep `MCP_AUTH_TOKEN` set in HTTP mode.
- Use only on trusted local networks.
- Do not expose this endpoint to the public internet.

## Emergency Stop

Physical `Esc` key aborts in-progress humanized pointer actions.
