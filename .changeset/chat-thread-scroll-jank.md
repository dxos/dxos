---
'@dxos/react-ui-feed': patch
---

Scrolling a long message feed no longer janks. Rows no longer re-render on every scroll event, a jump fills in a few rows per frame (visible rows first) instead of mounting the whole window in one task, and CodeMirror's shared stylesheet is no longer rewritten each time a row mounts (`style-mod` 4.1.4). `TogglePanel.Root` takes `lazyMount` to build its body on first open.
