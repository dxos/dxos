---
'@dxos/log': minor
---

Add an in-app log viewer as a composite `Logger` component (`@dxos/react-ui-debug`, replacing `LogPanel`) with per-file log-level control and a text-match buffer filter, backed by a new dev-mode `logFileRegistry` in `@dxos/log` that records every log file at module load via the `@dxos/vite-plugin-log` transform.
