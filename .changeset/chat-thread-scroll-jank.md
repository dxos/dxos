---
'@dxos/react-ui-feed': patch
---

Scrolling a long message feed no longer janks: rows no longer re-render on every scroll event, a jump mounts only the rows in view before restoring the overscan over the next frames, and CodeMirror's shared stylesheet is no longer rewritten each time a row mounts (`style-mod` 4.1.4). `TogglePanel.Root` takes `lazyMount` to build its body on first open.
