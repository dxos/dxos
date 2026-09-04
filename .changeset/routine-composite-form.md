---
'@dxos/plugin-routine': minor
'@dxos/echo-client': patch
---

Collapse the routine editor into a single composite form (general fields, action, and trigger in one schema-driven form) and reuse it in the create-object dialog: picking a routine template now opens the full routine form over an unpersisted draft, persisted on Save. Routine templates scaffold enabled routines, since the dialog is now the review step.

Connector sync becomes account-level: `ConnectorSpec.SyncInput` is now a shared schema (`{ connection, priority? }`) that every connector sync operation (Gmail, Google Calendar/Contacts, JMAP, Bluesky, Discord, GitHub, Linear, Slack, Trello) uses, fanning out over the connection's bindings via `Binding.syncAll`, with one routine per connection wrapping the connector's own operation. The fan-out isolates bindings: every binding runs to completion and its outcome is collected, so one broken target neither interrupts a concurrent sibling nor starves the queued rest, and a provider 401 is retagged for reauthentication whether it arrives as a typed failure or a defect (including one buried in a wrapper's `cause`). Deleting a connection now removes its sync routine, so no orphaned schedule keeps firing. The routine is offered through the create-routine form when connecting an account — single- and multi-target alike — instead of created silently; the sync runs when the routine is saved, a target's Sync button syncs its account with the pressed target first, and a deleted routine is re-offered through the form on the next sync press.

Reading an unpersisted object no longer throws when one of its refs names a registry entry by type DXN rather than an object by entity id (`Ref.fromURI`). Off-database refs resolve against the link cache, which is keyed by entity id, so such a ref is now left unresolved instead of failing an invariant — the routine draft the create dialog renders binds its runnable operation that way.
