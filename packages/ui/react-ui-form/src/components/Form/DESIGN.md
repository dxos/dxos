# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` + `values`; the field set renders typed
controls automatically. Bespoke controls drop in via `Form.Row` or a per-path `fieldMap`.

## Component hierarchy

```text
Form.Root                             context: schema, values, validation, onValuesChanged
└─ Form.Viewport                      scroll chrome
   └─ Form.Content
      ├─ Form.Section                 titled group of fields
      │  ├─ Form.FieldSet             schema-driven field set
      │  │  └─ FormFieldContainer     group wrapper: FormFieldHeader (label + collapse) over the body
      │  │     └─ FormField  ×N        one per schema property; dispatches by type:
      │  │        ├─ Form.Row          scalar → label + description + the control (<field>)
      │  │        ├─ ArrayField        array → FormFieldHeader + item rows
      │  │        └─ Form.FieldSet     nested object → recurses (its own FormFieldContainer)
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
- **`FormFieldContainer`** — the **group wrapper rendered only by `Form.FieldSet`**: a
  `FormFieldHeader` (shared label/description + collapse) over the field-set body. Nested objects
  recurse through `Form.FieldSet`, so each level gets its own container.

Typed scalar inputs (`TextField`, `SelectField`, …) live under `FormField/fields/*`; `ArrayField`
reuses `FormFieldHeader` directly for its list header.

## Higher-level components

Built on the above: `ObjectForm`, `ObjectPicker`, `ObjectProperties`, `ObjectTree`, `Settings`,
`ViewEditor`, `FieldEditor`, `RefEditor`.
