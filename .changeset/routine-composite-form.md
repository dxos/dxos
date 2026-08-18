---
'@dxos/plugin-routine': minor
'@dxos/echo': minor
---

Collapse the routine editor into a single composite form (general fields, action, and trigger in one schema-driven form) and reuse it in the create-object dialog: picking a routine template now opens the full routine form over an unpersisted draft, persisted on Save. Routine templates scaffold enabled routines, since the dialog is now the review step.

Connector sync becomes account-level: `ConnectorSpec.SyncInput` is `{ connection, priority? }` and every connector sync operation (Gmail, Google Calendar/Contacts, JMAP, Bluesky, Discord, GitHub, Linear, Slack, Trello) fans out over the connection's bindings via `Binding.syncAll`, with one routine per connection wrapping the connector's own operation. The routine is offered through the create-routine form when connecting an account — single- and multi-target alike — instead of created silently; the sync runs when the routine is saved, a target's Sync button syncs its account with the pressed target first, and a deleted routine is re-offered through the form on the next sync press.

Adds `Query.referenceAt(path, target)` for traversing an outgoing reference held at a nested property path, which `reference` cannot name.
