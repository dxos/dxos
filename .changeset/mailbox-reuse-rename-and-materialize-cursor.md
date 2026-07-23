---
'@dxos/plugin-connector': patch
---

Fix rebinding a target (e.g. a Mailbox) to an existing connection not renaming it after the connection's account, and fix the newly-created cursor for a target materialized alongside a brand-new connection not being immediately visible to the sync trigger UI.
