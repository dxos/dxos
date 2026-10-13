---
'@dxos/plugin-deck': patch
'@dxos/plugin-space': patch
---

The create-object dialog creates one object per open: a second pick while it closes no longer adds another. Closing an app dialog returns focus to where it was before the dialog opened, so creating an object from a document's `@` menu leaves the cursor after the new link.
