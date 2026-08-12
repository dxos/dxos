---
'@dxos/plugin-connector': patch
---

Always show one of Connect or Sync on a bindable object's toolbar: an unconnected mailbox or calendar keeps a Connect button, disabled when no provider is registered for its type and nothing is left to reuse, and a bound one whose provider plugin is absent shows Sync disabled rather than a button that does nothing.
