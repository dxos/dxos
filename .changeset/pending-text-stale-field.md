---
'@dxos/ui-editor': patch
---

Fix `RangeError: Field is not present in this state` thrown from the editor's pending-text (streaming) extension when the editor is reconfigured while a pending session is open. The deferred busy-flag update is now bound to the extension's lifetime and is cancelled on teardown.
