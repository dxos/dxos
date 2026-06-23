# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` + `values`; the field set renders typed
controls automatically. Bespoke controls drop in via `Form.Row` or a per-path `fieldMap`.

## Component hierarchy

```text
Form.Root                             context: schema, values, validation, onValuesChanged
└─ Form.Viewport                      scroll chrome
   └─ Form.Content
      ├─ Form.Section                 titled group of fields
      │  ├─ Form.FieldSet             renders one FormField per schema property (the auto form body)
      │  │  └─ FormField              schema-bound field: picks rendering by property type
      │  │     ├─ Form.Row            scalar field → label + description + the control (<field>)
      │  │     └─ FormFieldContainer  composite field (object/array/tuple) → wraps nested fields
      │  │        ├─ FormFieldHeader  group label/description (+ collapse toggle)
      │  │        └─ FormField …      nested fields (recurses)
      │  └─ Form.Row                  OR a hand-written row (label + description + any control)
      ├─ Form.Layout                  alternative to FieldSet: lays fields out per a parsed layout spec
      └─ Form.Actions
         └─ Form.Submit
            Form.Error
```

## FormField vs Form.Row

- **`FormField`** — _schema-driven_. Given a property path it chooses the rendering by type and pulls
  label/description from the schema/annotations. The automatic path (via `Form.FieldSet`); a
  `fieldMap` can override rendering per JSON path.
- **`Form.Row`** — _presentation primitive_. A labeled row (label + optional description + control
  children) with no schema awareness. Every **scalar** field renders through it, and it's used
  directly for custom controls (e.g. `fieldMap` entries, settings rows).
- **`FormFieldContainer`** — wraps a **composite** field (object/array/tuple): a `FormFieldHeader`
  (shared group label/description + collapse) over nested `FormField`s. Composite fields use this
  instead of `Form.Row`.

Typed scalar inputs (`TextField`, `SelectField`, …) live under `FormField/fields/*`.

## Higher-level components

Built on the above: `ObjectForm`, `ObjectPicker`, `ObjectProperties`, `ObjectTree`, `Settings`,
`ViewEditor`, `FieldEditor`, `RefEditor`.
