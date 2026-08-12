---
'@dxos/plugin-routine': minor
---

Collapse the routine editor into a single composite form (general fields, action, and trigger in one schema-driven form) and reuse it in the create-object dialog: picking a routine template now opens the full routine form over an unpersisted draft, persisted on Save. Connector sync is now driven by one account-level routine per connection (its trigger runs the SyncConnection fan-out over every binding), offered through that same form when connecting an account — single- and multi-target alike — instead of per-binding routines created silently in the background; the first sync runs when the routine is saved, a target's Sync button syncs its account with the pressed target first, and a deleted routine is re-offered through the form on the next sync press.
