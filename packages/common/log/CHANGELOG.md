# @dxos/log

## 0.12.0

### Patch Changes

- Updated dependencies [e8088ea]
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
