# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` + `values`; the field set renders typed
controls automatically. Bespoke controls drop in via `Form.Field` or a per-path `fieldMap`.

Naming, one level each: a **field set** (`Form.FieldSet`, a `<fieldset>`) holds **fields**
(`Form.Field`, one label + control); `FormFieldDispatch` is the factory that picks a field's renderer
from the schema, and the renderers themselves live in `FormField/fields/*Field`.

## Component hierarchy

```text
Form.Root                               context: schema, values, validation, onValuesChanged
└─ Form.Viewport                        scroll chrome
   └─ Form.Content
      ├─ Form.Section                   titled group of fields
      │  ├─ Form.FieldSet               schema-driven field set
      │  │  └─ FormFieldSetContainer    group wrapper: a Fieldset named by its legend; when collapsible, the legend holds the disclosure
      │  │     └─ FormFieldDispatch     one per schema property; `resolveFieldRenderer` picks the renderer by annotation, then type:
      │  │        ├─ ArrayField         array → FormFieldHeader + item rows
      │  │        ├─ Form.FieldSet      nested object → recurses (its own FormFieldSetContainer)
      │  │        └─ Form.Field           scalar → one field: label + description + the control + validation
      │  └─ Form.Field                    OR a hand-written field (label + description + any control)
      ├─ Form.Layout                    alternative to FieldSet: lays fields out per a parsed layout spec
      └─ Form.Actions
         └─ Form.Submit
            Form.Error
```

## Primitive mapping

What each form component is built from, one layer down (`@dxos/react-ui`) and two layers down
(`@ark-ui/react`). A blank cell means the layer adds nothing there: the component is plain markup.
`Input` in `@dxos/react-ui` is Ark's `Field` under another name and is due to be renamed `Field`, so
the middle column already reads as that mapping.

| `@dxos/react-ui-form`                         | `@dxos/react-ui`                                                                            | `@ark-ui/react`                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Form.Root`                                   |                                                                                             |                                                                    |
| `Form.Viewport`                               | `ScrollArea`                                                                                | `ScrollArea`                                                       |
| `Form.Content`                                |                                                                                             |                                                                    |
| `Form.Section`                                | `Fieldset.Root`, `Fieldset.Legend` (around an `<h2>`)                                       | `Fieldset.Root`, `Fieldset.Legend`                                 |
| `Form.Group`                                  |                                                                                             |                                                                    |
| `Form.FieldSet` / `FormFieldSetContainer`     | `Fieldset.Root`, `Fieldset.Legend`; `Collapsible.Root`/`Trigger`/`Content` when collapsible | `Fieldset.*`, `Collapsible.*`                                      |
| `FormFieldHeader`                             | `Form.Label` (standalone), `IconButton`                                                     |                                                                    |
| `Form.Field` — field mode (schema field)      | `Input.Root`, `Input.Label`, `Input.Description`, `Input.Validation`                        | `Field.Root`, `Field.Label`, `Field.HelperText`, `Field.ErrorText` |
| `Form.Field` — action mode (element children) | plain `<div>` / `<span>` / `<p>`                                                            |                                                                    |
| `Form.Label`                                  | `Input.Label`                                                                               | `Field.Label`                                                      |
| `Form.Actions`, `Form.Submit`                 | `Button`                                                                                    |                                                                    |
| `Form.Error`                                  | `Input.Root` (error valence), `Input.Validation`                                            | `Field.Root`, `Field.ErrorText`                                    |
|                                               |                                                                                             |                                                                    |
| `TextField`, `PasswordField`, `NumberField`   | `Input.TextInput`                                                                           | `Field.Input`                                                      |
| `TextAreaField`, `MarkdownField`              | `Input.TextArea` / editor                                                                   | `Field.Textarea`                                                   |
| `BooleanField`                                | `Input.Switch`                                                                              | `Switch`                                                           |
| `DateField`                                   | `Input.Date`, `Input.DateTime`, `Input.Time`                                                | `Field` parts + `Popover` (react-aria date field)                  |
| `SelectField`, `SelectOptionField`            | `Select.Root`                                                                               | `Select`                                                           |
| `ComboboxField`, `RefField`                   | `Combobox.Root`                                                                             | `Combobox`                                                         |
| `ArrayField`                                  | `FormFieldHeader` + rows                                                                    |                                                                    |

The two gaps this table makes visible: `Form.Field` in action mode is not a `Field`, so a hand-written
settings row has no field scope for its label and description; and `Form.Group` is a styled `div`
rather than a `Fieldset`.
