# pc-control-mcp

Real-time desktop control MCP server for Windows.

## What It Does

This MCP lets an agent control a Windows desktop in real time using:
- mouse
- keyboard
- screenshot observation

The interaction model is single-step:
- observe screen
- do one action
- observe again

## How It Works

Runtime loop:
1. `session_start`
2. `session_observe`
3. `session_step` (one action only)
4. repeat step 2-3
5. `session_end`

Emergency stop:
- physical `Esc` key aborts in-progress humanized pointer actions.

## Run Server

```bash
npm install
npm run build
npm start
```

Default transport is HTTP.

Environment options:
- `MCP_HTTP_HOST` (default `0.0.0.0`)
- `MCP_HTTP_PORT` (default `3333`)
- `MCP_AUTH_TOKEN` (recommended)
- `MCP_TRANSPORT` (`http` or `stdio`)

## MCP Client Config Samples

### 1) HTTP / IP mode (LAN)

```json
{
  "mcpServers": {
    "pc-control": {
      "transport": "streamable_http",
      "url": "http://<IP>:<PORT>/mcp",
      "headers": {
        "Authorization": "Bearer <AUTH_TOKEN>"
      }
    }
  }
}
```

### 2) stdio mode

```json
{
  "mcpServers": {
    "pc-control": {
      "command": "node",
      "args": ["build/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## Security

This MCP controls local input and reads screenshots.
Use only on trusted machines/networks and always set an auth token in HTTP mode.
