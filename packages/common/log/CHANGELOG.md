# @dxos/log

## 0.12.0

### Patch Changes

- 4aa6a33: MCP servers speak protocol revision 2026-07-28, which carries the client's identity and requested
  revision in each request rather than in a session opened by `initialize`. Effect moves to
  4.0.0-rc.117 for it. 2025-06-18 is still served, and everything it needs sits in `legacy-*` modules
  or under a marker naming the surface that must drop it, so removing that support later is deletion.

  `McpServer.normalizeResponse` takes the request, so a reply Effect framed as an event stream
  collapses back to its single JSON message, and a notification-only reply answers 202.
  `$mcp_initialize` is recorded once per successful handshake on either revision, and every MCP event
  carries a client name. `@dxos/log` gains a `noop` processor, which a server whose stdout carries a
  protocol selects so it logs only through the processors observability installs.

- Updated dependencies [967b130]
- Updated dependencies [9d2466a]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [4da1052]
  - @dxos/util@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- f6a01e3: Add an in-app log viewer as a composite `Logger` component (`@dxos/react-ui-debug`, replacing `LogPanel`) with per-file log-level control and a text-match buffer filter, backed by a new dev-mode `logFileRegistry` in `@dxos/log` that records every log file at module load via the `@dxos/vite-plugin-log` transform.

### Patch Changes

- Updated dependencies [3f1fc67]
  - @dxos/util@0.11.0
  - @dxos/node-std@0.11.0
