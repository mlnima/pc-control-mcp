# ARCHITECTURE

## Purpose

`pc-control-mcp` is a real-time desktop control MCP server for Windows.

It intentionally exposes only:
- mouse actions
- keyboard actions
- screenshot observation

No programmatic app/window/process control is exposed in MCP tools.

## Runtime Modes

- `stdio` mode (default): local MCP clients that spawn the server process.
- `http` mode: Streamable HTTP MCP endpoint for LAN access.

Mode is selected by env var:

- `MCP_TRANSPORT=stdio|http`

HTTP mode settings:

- `MCP_HTTP_HOST` (default `0.0.0.0`)
- `MCP_HTTP_PORT` (default `3333`)
- `MCP_AUTH_TOKEN` (optional Bearer token, recommended)

## Session Contract

Tools are session-first and step-based:

1. `session_start`
2. `session_observe`
3. `session_step` (one action only)
4. use returned observation
5. repeat
6. `session_end`

`session_step` requires the latest `observationId` to prevent stale/blind actions.

## Allowed Step Actions

- `move_mouse`
- `click`
- `double_click`
- `mouse_down`
- `mouse_up`
- `drag_move`
- `scroll`
- `key_press`
- `type_text`

## Safety

- Emergency key (`Esc`) can abort in-progress humanized pointer movement.
- Optional auth token for HTTP mode.

## Implementation Notes

- A fresh MCP server runtime is created per Streamable HTTP session during initialization.
- Session state stores current observation token and drag state.
- Observation payload contains cursor state and optional screenshot image (`base64`).
