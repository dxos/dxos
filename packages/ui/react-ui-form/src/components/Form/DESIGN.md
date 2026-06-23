# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` + `values`; the field set renders typed
controls automatically. Bespoke controls drop in via `Form.Row` or a per-path `fieldMap`.

## Component hierarchy

```text
Form.Root                               context: schema, values, validation, onValuesChanged
└─ Form.Viewport                        scroll chrome
   └─ Form.Content
      ├─ Form.Section                   titled group of fields
      │  ├─ Form.FieldSet               schema-driven field set
      │  │  └─ FormFieldSetContainer    group wrapper: FormFieldHeader (label + collapse) over the body
      │  │     └─ FormField             one per schema property; dispatches by type:
      │  │        ├─ ArrayField         array → FormFieldHeader + item rows
      │  │        ├─ Form.FieldSet      nested object → recurses (its own FormFieldSetContainer)
      │  │        └─ Form.Row           scalar → label + description + the control (<field>)
      │  └─ Form.Row                    OR a hand-written row (label + description + any control)
      ├─ Form.Layout                    alternative to FieldSet: lays fields out per a parsed layout spec
      └─ Form.Actions
         └─ Form.Submit
            Form.Error
```
