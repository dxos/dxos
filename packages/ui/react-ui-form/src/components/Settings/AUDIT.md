# Plugin Settings Audit

Tracks which plugin settings panels use schema-driven `SettingsForm.FieldSet` and which still hand-roll their controls.

The target shape for a plugin settings panel is:

```tsx
<SettingsForm.Viewport>
  <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
    <SettingsForm.FieldSet
      readonly={!onSettingsChange}
      schema={Settings.Settings}
      values={settings}
      onValuesChanged={(values) => onSettingsChange?.(() => values)}
    />
  </SettingsForm.Section>
</SettingsForm.Viewport>
```

Field labels and descriptions come from `.annotations({ title, description })` on each schema field. Use `fieldMap` for runtime-driven option lists (model pickers, etc.). Use the `visible` callback to gate fields on environment or sibling values.

## FieldSet adopters

| Plugin                 | Notes                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `plugin-assistant`     | Nested `modelDefaults` struct; `fieldMap` provides per-provider model selectors via `createSelectField`. |
| `plugin-crx`           | Two booleans.                                                                                            |
| `plugin-deck`          | Five booleans; `enableNativeRedirect` hidden via `visible` when `isSocket`.                              |
| `plugin-inbox`         | Single boolean.                                                                                          |
| `plugin-markdown`      | Original reference adopter. `snippets` text field gated via `visible`/`fieldMap`.                        |
| `plugin-meeting`       | Single boolean.                                                                                          |
| `plugin-observability` | Boolean; info `Message.Root` banner kept above `FieldSet`.                                               |
| `plugin-presenter`     | Single boolean.                                                                                          |
| `plugin-sample`        | Single boolean.                                                                                          |
| `plugin-script`        | Mixed: auth `Button` retained as a manual `SettingsForm.Item`; `editorInputMode` rendered by `FieldSet`. |
| `plugin-sketch`        | Boolean + `gridType` literal union (rendered as a Select — was previously a Switch).                     |

## Skipped

| Plugin             | Reason                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-debug`     | Action buttons (download diagnostics, download logs, repair), `Toast`, and a storage-adapter selector wired to `client.config` rather than the plugin settings atom. |
| `plugin-files`     | `IconButton` actions (select root, export, import) and gating on non-schema state (`state.rootHandle`).                                                              |
| `plugin-space`     | Renders a list of spaces with per-space "open settings" buttons — not bound to any schema field.                                                                     |
| `plugin-spacetime` | Section is currently empty; nothing to render.                                                                                                                       |
| `plugin-thread`    | Settings schema is `Schema.Struct({})` — nothing to render.                                                                                                          |

## When to extend `SettingsFieldSet` vs. add a custom field

- **Extend `SettingsFieldSet`** when the rendering rule applies generally to a schema construct (e.g. nested structs recursing into sibling fields, literal unions becoming Selects). Keep auto-detection in `detectFieldType`.
- **Use `fieldMap`** when the schema can't fully describe the rendering — runtime-driven option lists, custom inputs, or override of the auto-rendered control. Use the typed form `SettingsFieldMap<T>` (or `satisfies SettingsFieldMap<Settings>`) so the entries are checked against the values shape.
- **Drop back to manual `SettingsForm.Item`** when the panel needs UI that isn't bound to a settings field at all (action buttons, info banners, lists of external entities). These coexist as siblings of `FieldSet` inside the same `Section`.
