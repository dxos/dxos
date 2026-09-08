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
```<<<<<<< ours

## Primitive mapping

What each form component is built from, one layer down (`@dxos/react-ui`) and two layers down
(`@ark-ui/react`). A blank cell means the layer adds nothing there: the component is plain markup.
`@dxos/react-ui`'s `Field` is Ark's `Field` plus the standard form of each control (`Field.Input`,
`Field.Textarea`, `Field.Checkbox`, `Field.Switch`, …): one component per control, pre-wired to the
enclosing field, usable without a root. The composite anatomies (`Checkbox.*`, `Switch.*`) are Ark's.

| `@dxos/react-ui-form`                         | `@dxos/react-ui`                                                                            | `@ark-ui/react`                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Form.Root`                                   |                                                                                             |                                                                    |
| `Form.Viewport`                               | `ScrollArea`                                                                                | `ScrollArea`                                                       |
| `Form.Content`                                |                                                                                             |                                                                    |
| `Form.Section`                                | `Fieldset.Root`, `Fieldset.Legend` (around an `<h2>`)                                       | `Fieldset.Root`, `Fieldset.Legend`                                 |
| `Form.Group`                                  |                                                                                             |                                                                    |
| `Form.FieldSet` / `FormFieldSetContainer`     | `Fieldset.Root`, `Fieldset.Legend`; `Collapsible.Root`/`Trigger`/`Content` when collapsible | `Fieldset.*`, `Collapsible.*`                                      |
| `FormFieldHeader`                             | `Form.Label` (standalone), `IconButton`                                                     |                                                                    |
| `Form.Field` — field mode (schema field)      | `Field.Root`, `Field.Label`, `Field.HelperText`, `Field.ErrorText`                          | `Field.Root`, `Field.Label`, `Field.HelperText`, `Field.ErrorText` |
| `Form.Field` — action mode (element children) | plain `<div>` / `<span>` / `<p>`                                                            |                                                                    |
| `Form.Label`                                  | `Field.Label`                                                                               | `Field.Label`                                                      |
| `Form.Actions`, `Form.Submit`                 | `Button`                                                                                    |                                                                    |
| `Form.Error`                                  | `Field.Root` (error valence), `Field.ErrorText`                                             | `Field.Root`, `Field.ErrorText`                                    |
|                                               |                                                                                             |                                                                    |
| `TextField`, `PasswordField`, `NumberField`   | `Field.Input`                                                                               | `Field.Input`                                                      |
| `TextAreaField`, `MarkdownField`              | `Field.Textarea` / editor                                                                   | `Field.Textarea`                                                   |
| `BooleanField`                                | `Field.Switch`                                                                              | `Switch`                                                           |
| `DateField`                                   | `Field.Date`, `Field.DateTime`, `Field.Time`                                                | `Field` parts + `Popover` (react-aria date field)                  |
| `SelectField`, `SelectOptionField`            | `Select.Root`                                                                               | `Select`                                                           |
| `ComboboxField`, `RefField`                   | `Combobox.Root`                                                                             | `Combobox`                                                         |
| `ArrayField`                                  | `FormFieldHeader` + rows                                                                    |                                                                    |

The two gaps this table makes visible: `Form.Field` in action mode is not a `Field`, so a hand-written
settings row has no field scope for its label and description; and `Form.Group` is a styled `div`
rather than a `Fieldset`.

## Where this goes: binding, semantics and layout as three layers

`Form.Field` does three jobs today, and which it does is decided by the type of its `children`:

1. **Binding** — reading a value and its validation status out of the form model at a JSON path
   (a render-prop child plus `getValue`/`getStatus` from the dispatcher).
2. **Semantics** — the label, helper-text and error-text association: what Ark's `Field` is.
3. **Layout** — the settings card grid, the presentation modes, the required mark, `labelEnd`.

"Field mode" is all three; "action mode" (element children) is layout only, so a hand-written
settings row is a card with a label that no control is labelled by, and 17 of the ~70 such rows wrap
their own `Field.Root` inside the card to get a wired control, which yields a field with no label
inside a card that has one. The distinction that is real is only the first one — whether the row's
source of truth is the form model or state the caller owns — and it should never decide the other
two.

The design this is converging on keeps the three apart:

- **`Form.Root`** owns the model, the schema, validation and the cross-cutting modes (`readonly`,
  `presentation`, `hideEmpty`, `variant`) as context. They stop riding on each renderer's props.
- **`Form.Field path`** is a binding boundary with no DOM of its own. It resolves the schema
  property at `path` and provides `{ value, setValue, error, required, readonly, label,
description, format }` to whatever is inside. "Field" means what it means in a form: one field
  of the record.
- **The row is `@dxos/react-ui`'s `Field.Root`** with a form-variant theme (the card grid), and it
  is always a real field: `Field.Label`, `Field.HelperText`, `Field.ErrorText` around the control.
  Controls inside a bound row wire themselves from the binding through one hook (`useFormField`),
  the way Ark expects a form adapter to feed `Field`; a hand-written row is the same row without the
  binding. There is no action mode: a row whose children are not one control (a button, a readout, a
  picker) says `standalone`, which renders the label as text and skips the association.
- **`FormFieldDispatch` maps a schema property to a control**, and renders the row once around it.
  Renderers stop calling the shell themselves (17 do today, three bypass it), so every schema field
  is the same row, and a custom renderer from `fieldMap` is a control, not a row.
- **`Form.Section`, `Form.FieldSet` and `Form.Group` are the fieldset layer** and are unchanged:
  `Fieldset.Root` named by a `Fieldset.Legend`, collapsible where a nested group asks for it.

```tsx
// Schema-driven: the dispatcher renders this for every property.
<Form.Field path='name'>
  <Field.Root variant='settings'>
    <Field.Label />
    <Field.HelperText />
    <Field.Input />
    <Field.ErrorText />
  </Field.Root>
</Form.Field>

// Hand-written settings row: the same row, no binding.
<Field.Root variant='settings' label={t('wireframe.label')} description={t('wireframe.description')}>
  <Field.Switch checked={settings.wireframe} onCheckedChange={setWireframe} />
</Field.Root>
```

What changes for consumers: the ~70 hand-written rows become `Field.Root` with a variant (or keep a
thin `Form.Field`-shaped alias that is that), the 17 renderers become controls, and `Form.Row`-era
props that were layout (`labelEnd`, `standalone`, `presentation`) live on the row, binding props on
the boundary. The steps, in order and each landable alone: (1) the row is always a `Field.Root`,
with `standalone` for rows without a single control — this closes the two gaps above; (2) the
modes move to `Form.Root` context; (3) `useFormField` and the binding boundary, renderers become
controls, the dispatcher renders the row.
||||||| original

=======

## Primitive mapping

What each form component is built from, one layer down (`@dxos/react-ui`) and two layers down
(`@ark-ui/react`). A blank cell means the layer adds nothing there: the component is plain markup.
`@dxos/react-ui`'s `Field` is Ark's `Field` plus the standard form of each control (`Field.Input`,
`Field.Textarea`, `Field.Checkbox`, `Field.Switch`, …): one component per control, pre-wired to the
enclosing field, usable without a root. The composite anatomies (`Checkbox.*`, `Switch.*`) are Ark's.

| `@dxos/react-ui-form`                         | `@dxos/react-ui`                                                                            | `@ark-ui/react`                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Form.Root`                                   |                                                                                             |                                                                    |
| `Form.Viewport`                               | `ScrollArea`                                                                                | `ScrollArea`                                                       |
| `Form.Content`                                |                                                                                             |                                                                    |
| `Form.Section`                                | `Fieldset.Root`, `Fieldset.Legend` (around an `<h2>`)                                       | `Fieldset.Root`, `Fieldset.Legend`                                 |
| `Form.Group`                                  |                                                                                             |                                                                    |
| `Form.FieldSet` / `FormFieldSetContainer`     | `Fieldset.Root`, `Fieldset.Legend`; `Collapsible.Root`/`Trigger`/`Content` when collapsible | `Fieldset.*`, `Collapsible.*`                                      |
| `FormFieldHeader`                             | `Form.Label` (standalone), `IconButton`                                                     |                                                                    |
| `Form.Field` — field mode (schema field)      | `Field.Root`, `Field.Label`, `Field.Description`, `Field.Validation`                        | `Field.Root`, `Field.Label`, `Field.HelperText`, `Field.ErrorText` |
| `Form.Field` — action mode (element children) | plain `<div>` / `<span>` / `<p>`                                                            |                                                                    |
| `Form.Label`                                  | `Field.Label`                                                                               | `Field.Label`                                                      |
| `Form.Actions`, `Form.Submit`                 | `Button`                                                                                    |                                                                    |
| `Form.Error`                                  | `Field.Root` (error valence), `Field.Validation`                                            | `Field.Root`, `Field.ErrorText`                                    |
|                                               |                                                                                             |                                                                    |
| `TextField`, `PasswordField`, `NumberField`   | `Field.TextInput`                                                                           | `Field.Input`                                                      |
| `TextAreaField`, `MarkdownField`              | `Field.TextArea` / editor                                                                   | `Field.Textarea`                                                   |
| `BooleanField`                                | `Field.Switch`                                                                              | `Switch`                                                           |
| `DateField`                                   | `Field.Date`, `Field.DateTime`, `Field.Time`                                                | `Field` parts + `Popover` (react-aria date field)                  |
| `SelectField`, `SelectOptionField`            | `Select.Root`                                                                               | `Select`                                                           |
| `ComboboxField`, `RefField`                   | `Combobox.Root`                                                                             | `Combobox`                                                         |
| `ArrayField`                                  | `FormFieldHeader` + rows                                                                    |                                                                    |

The two gaps this table makes visible: `Form.Field` in action mode is not a `Field`, so a hand-written
settings row has no field scope for its label and description; and `Form.Group` is a styled `div`
rather than a `Fieldset`.
>>>>>>> theirs
