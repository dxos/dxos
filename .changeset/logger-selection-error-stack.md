---
'@dxos/react-ui-debug': patch
'@dxos/react-ui': patch
---

Logger panel review follow-ups:

- **@dxos/react-ui-debug**: each `Logger.Root` recording session now self-filters via its own parsed filter and registers in a module-level recorder registry that composes the shared `@dxos/log` config (union) and restores it on the last release — concurrent panels with divergent filters no longer clobber each other. The log list gains a per-row checkbox (Copy log then exports only the checked rows), full-line selection styled via `aria-current`/`dx-current`, arrow-key navigation between lines (inner controls opt out of the roving tabindex), Space to toggle expansion, and Enter to toggle the checkbox. Expanded rows render message/context via `JsonHighlighter` and error stacks via the shared `ErrorStack` (clickable `vscode://` frames). Each row also shows the derived package (from the log's source path) above the filename, mirroring the Levels popover.
- **@dxos/react-ui**: `ErrorStack` now accepts a `classNames` prop so consumers can style the trace container.
