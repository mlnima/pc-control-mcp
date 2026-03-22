# ROADMAP

## Phase 0 (Done)

- Refactor to layered architecture (`core` + `platform/windows`).
- Add human-like movement engine.
- Add atomic mouse primitives and human drag/click/move tools.
- Replace unstable window enumeration implementation.

## Phase 1 (Next)

- Add `window_capture`:
  - focus/find window
  - get bounds
  - capture screen
  - crop to window rectangle
- Add `wait_until_window` and `wait_until_process` helpers.
- Add retry wrappers for window focus and app launch flows.

Acceptance:
- Repeatedly launch/focus/capture top 5 desktop apps with high success rate.

## Phase 2

- Add perception tools:
  - OCR extraction from screenshot/window capture
  - text position detection
- Add target-relative input actions:
  - click by coordinate in window space
  - drag in window space

Acceptance:
- Complete browser and file manager scripted tasks using OCR-driven targeting.

## Phase 3

- Add policy controls:
  - tool allow/deny by profile
  - path allowlist for `fs_*`
  - command allowlist mode for `cmd_run`
- Add audit logs per run:
  - timestamped action records
  - result status
  - optional screenshot snapshots

Acceptance:
- Policy violations block safely and are logged.

## Phase 4

- Add execution reliability engine:
  - action graph
  - retries with backoff
  - postcondition assertions
  - interruption recovery

Acceptance:
- Long desktop tasks run with automatic recoveries from focus changes.

## Phase 5

- Add macOS adapter (feature parity target).
- Add Linux adapter (X11 first, Wayland strategy afterward).

Acceptance:
- Same MCP tool names and schemas run across OS adapters.
