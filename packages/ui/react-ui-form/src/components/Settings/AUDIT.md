# Settings UI Audit

Two families in `@dxos/react-ui-form` render settings/account-style UI:

- **`Form` (variant `settings`)** — the schema-driven settings *panel*:
  `Form.Root variant='settings'` → `Form.Viewport` → `Form.Content` → `Form.Section title={meta.profile.name}` → `Form.FieldSet`.
  Every plugin settings panel now uses this (assistant, crx, deck, file, native, observability, script, support, …). Field
  labels/descriptions come from schema `.annotations({ title, description })`; use `fieldMap` for runtime-driven option lists
  (model pickers, etc.) and `visible` to gate fields.
- **`Settings.*`** — a manual card-list layout family (`Settings.Root/Viewport/Section/Panel/Item/FieldSet`) for UI that is
  **not** bound to a settings schema: lists of devices/members/spaces, account/profile cards, action rows. `Settings.Item`
  is the labeled-card row (equivalent to `Form.Row`'s action mode).

## Remaining `Settings.*` uses

`Settings.FieldSet` (the schema-driven path) has **no remaining consumers** — settings panels moved to `Form.FieldSet`. The
`Settings.*` layout primitives are still used by these non-panel containers:

| Container                      | Plugin             | `Settings.*` used                 |
| ------------------------------ | ------------------ | --------------------------------- |
| `AccountContainer`             | plugin-client      | Viewport, Section, Item           |
| `DevicesContainer`             | plugin-client      | Viewport, Section, Panel, Item    |
| `ProfileContainer`             | plugin-client      | Viewport, Section, Item           |
| `InvitationsContainer`         | plugin-client      | Viewport, Section, Item           |
| `RecoveryCredentialsContainer` | plugin-client      | Viewport, Section, Item           |
| `MembersContainer`             | plugin-space       | Viewport, Section, Panel          |
| `SchemaContainer`              | plugin-space       | Viewport, Section                 |
| `IntegrationArticle`           | plugin-integration | Viewport, Section, Panel, Item    |

Each renders lists/cards of external entities (devices, members, invitations, schema types, integrations) with no settings
schema to drive a `FieldSet`, so they stay on the `Settings.*` primitives.

## Guidance

- **Plugin settings panel** → `Form` (variant `settings`) + `Form.FieldSet` over the settings schema; `fieldMap` for
  runtime-driven controls, `visible` to gate fields.
- **Card list / action rows** (no schema binding) → `Settings.*` primitives, or `Form.Row` action mode for a single labeled row.
