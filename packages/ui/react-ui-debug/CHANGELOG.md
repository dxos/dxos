# @dxos/react-ui-debug

## 0.12.0

### Patch Changes

- Updated dependencies [96f94c2]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [c0e5651]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [0c92b44]
- Updated dependencies [32584c9]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
- Updated dependencies [4ae2005]
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-syntax-highlighter@0.12.0
  - @dxos/log@0.12.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1

## 0.11.0

### Patch Changes

- c9651f1: Logger panel review follow-ups:
  - **@dxos/react-ui-debug**: each `Logger.Root` recording session now self-filters via its own parsed filter and registers in a module-level recorder registry that composes the shared `@dxos/log` config (union) and restores it on the last release — concurrent panels with divergent filters no longer clobber each other. The log list gains a per-row checkbox (Copy log then exports only the checked rows), full-line selection styled via `aria-current`/`dx-current`, arrow-key navigation between lines (inner controls opt out of the roving tabindex), Space to toggle expansion, and Enter to toggle the checkbox. Expanded rows render message/context via `JsonHighlighter` and error stacks via the shared `ErrorStack` (clickable `vscode://` frames). Each log record also retains the derived package (from its source path) for display/export.
  - **@dxos/react-ui**: `ErrorStack` now accepts a `classNames` prop so consumers can style the trace container.

- 46ac889: The debug Logger now persists per-file log level overrides across reloads (via a `local`-backed react-ui-attention view-state aspect instead of component-local state) and shows the full repo-relative source path — as a `file` key in the expanded row's JSON, and as the row tooltip — while the row column keeps showing just the basename.
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [2fe5a7a]
- Updated dependencies [277e365]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
