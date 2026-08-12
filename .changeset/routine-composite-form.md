---
'@dxos/plugin-routine': minor
---

Collapse the routine editor into a single composite form (general fields, action, and trigger in one schema-driven form) and reuse it in the create-object dialog: picking a routine template now opens the full routine form over an unpersisted draft, persisted on Save. Connecting a single-target account (e.g. Gmail) now offers its recurring sync routine through that same form — seeded from the connector's sync template — instead of creating it silently in the background; the first sync runs when the routine is saved.
