# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` + `values`; the field set renders typed
controls automatically. Bespoke controls drop in via `Form.Row` or a per-path `fieldMap`.

## Component hierarchy

```
Form.Root                           context: schema, values, validation, onValuesChanged
└─ Form.Viewport                    scroll chrome
   └─ Form.Content
      ├─ Form.Section               titled group of fields
      │  ├─ Form.FieldSet           renders one FormField per schema property (the auto form body)
      │  │  └─ FormField            schema-bound field: picks a typed control by property type
      │  │     └─ <field>           field types
      │  │        └─ Form.Row       label + description + the control
      │  └─ Form.Row                OR a hand-written row (label + description + any control)
      ├─ Form.Layout                alternative to FieldSet: lays fields out per a parsed layout spec
      └─ Form.Actions
         └─ Form.Submit
            Form.Error
```

## FormField vs Form.Row

- **`FormField`** — _schema-driven_. Given a property path it chooses the control by type and pulls
  label/description from the schema/annotations. The automatic path (via `Form.FieldSet`); a
  `fieldMap` can override rendering per JSON path.
- **`Form.Row`** — _presentation primitive_. A labeled row (label + optional description + control
  children) with no schema awareness. Every typed field renders through it, and it's used directly
  for custom controls (e.g. `fieldMap` entries, settings rows).

Internals: `FieldContainer` (control wrapper) + `FieldHeader` (label/description); typed inputs live
under `FormField/fields/*`.

## Higher-level components

Built on the above: `ObjectForm`, `ObjectPicker`, `ObjectProperties`, `ObjectTree`, `Settings`,
`ViewEditor`, `FieldEditor`, `RefEditor`.
