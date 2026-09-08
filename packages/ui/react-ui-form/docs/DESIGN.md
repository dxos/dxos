# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` and `values`; a field set renders typed
controls for every property. Hand-written rows and groups use the same parts, with or without a
binding to the model.

## Ontology

Three fixed points: `Form.Root` is the outer scope, with or without a schema, and forms nest; the
leaves are fields; fields are grouped by field sets, which carry their own label. Three concerns are
kept apart and never decide each other:

1. **Binding** — where a value and its validation status come from: the form model at a `path`,
   or state the caller owns.
2. **Semantics** — the label, helper-text and error-text association: Ark's `Field` and
   `Fieldset`, wrapped by `@dxos/react-ui`.
3. **Layout** — the card grid, the presentation modes, the required mark, the depth chrome.

A row or group is **bound** when it has a `path` (or sits under a `Form.Root path`) and its parts
read the binding through one hook, `useFormField`; without a path it is **unbound** and the caller
wires the control. Nothing in how the row renders differs between the two. Decided 2026-09-08:
`Form.Field` and `Form.FieldSet` are what a consumer writes in every case, so this package owns the
row and the group and `@dxos/react-ui`'s `Field`/`Fieldset` stay primitives; `Form.Root` and
`Form.FieldSet` both take a `path`.

| Component        | Built from                                                                                  | Role                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Form.Root`      | nothing (a scope; only the outermost with `onSave` renders `<form>`)                        | The model boundary: `schema?`, `values`/`defaultValues`, `onValuesChanged`, `onSave`, `autoSave`, and the modes as context (`readonly`, `presentation`, `variant`). Nests two ways: with `path` it binds a sub-tree of the enclosing model and shares its validation; with its own `schema` + `values` it is an independent form embedded in another.                              |
| `Form.Viewport`  | `ScrollArea`                                                                                | The scroll region.                                                                                                                                                                                                                                                                                                                                                                 |
| `Form.Content`   | nothing                                                                                     | The measure and gutter inside the viewport: the bounded surface the scroll region lives in, as Popover's `Content` is to its `Viewport`.                                                                                                                                                                                                                                           |
| `Form.FieldSet`  | `Fieldset.Root` + `Legend` + `HelperText` + `ErrorText`; `Collapsible.*` when `collapsible` | The one grouping element at any depth: `label`, `description`, `collapsible`, `path?`. With `path` it binds an object property (label from the schema title) and, with no children, enumerates its fields (`exclude`, `sort`, `filter`). Depth chrome comes from context: a top-level legend is a heading with the section gap, a nested one a plain legend with an indented body. |
| `Form.Field`     | `Field.Root` + `Label` + `HelperText` + `ErrorText` + the control                           | The leaf, always a real field. With `path` it is bound: label, description, value, error, required and readonly come from the schema and model, and with no children the dispatcher picks the control. Without `path` it takes `label`/`description`/`error` as props and its children are the control. `standalone` for a row with no single control (a button, a readout).       |
| `Form.List`      | `Fieldset.Root` + `Legend`; items are `Form.FieldSet` / `Form.Field`                        | The repeating group (an array property): `path`, an item template, `Form.List.Item` with move and remove, `Form.List.Add`. Ark has no repeater; this is the one form-specific structure.                                                                                                                                                                                           |
| `Form.Layout`    | nothing                                                                                     | Visual arrangement with no semantics: columns, inline pairs, the parsed layout spec. Used inside a field set, never in place of one.                                                                                                                                                                                                                                               |
| `Form.Actions`   | nothing (`Dialog.ActionBar` is the sibling)                                                 | The action row: `Form.Submit`, `Form.Cancel`, `Form.Reset`.                                                                                                                                                                                                                                                                                                                        |
| `Form.ErrorText` | `Fieldset.ErrorText` on the root                                                            | The form-level error.                                                                                                                                                                                                                                                                                                                                                              |

Deliberately absent: `Positioner` and `Arrow` belong to floating surfaces and never appear here (a
date picker's popover is inside its control); sections and groups are field sets; the controls
(`TextField`, `DateField`, `RefField`, …) are controls the dispatcher places in a `Form.Field`, not
rows of their own. The dispatcher, `FormFieldDispatch`, maps a schema property to a control through
the pure `resolveFieldRenderer` (annotation first, then format, then type) and renders the row once
around it.

Controls map onto `@dxos/react-ui` as: text, password, number → `Field.Input`; textarea and
markdown → `Field.Textarea` / the editor; boolean → `Field.Switch`; date, time → `Field.Date`,
`Field.Time`, `Field.DateTime`; literal options → `Select`; lookups and references → `Combobox`.

## Examples

### A schema-driven settings panel with one custom control and one unbound row

```tsx
<Form.Root schema={DeckSettingsSchema} values={settings} onValuesChanged={setSettings} autoSave variant='settings'>
  <Form.Viewport>
    <Form.Content>
      <Form.FieldSet label={t('deck.label')} description={t('deck.description')} exclude={['hue']} />
      <Form.FieldSet label={t('appearance.label')}>
        <Form.Field path='hue'>
          <HuePicker /> {/* useFormField(): { value, setValue } */}
        </Form.Field>
        <Form.Field standalone label={t('reset.label')} description={t('reset.description')}>
          <Button onClick={handleReset}>{t('reset.button')}</Button>
        </Form.Field>
      </Form.FieldSet>
    </Form.Content>
  </Form.Viewport>
</Form.Root>
```

The first field set enumerates the schema; the second is hand-written, but the bound
`Form.Field path='hue'` still takes its label and description from the schema.

### An edit dialog with a nested object, a list and actions

```tsx
<Form.Root schema={ContactSchema} defaultValues={contact} onSave={save} onCancel={close}>
  <Form.Content>
    <Form.FieldSet label={t('contact.label')}>
      <Form.Field path='name' />
      <Form.Layout columns={2}>
        <Form.Field path='email' />
        <Form.Field path='phone' />
      </Form.Layout>
      <Form.FieldSet path='address' collapsible /> {/* nested object: legend from the schema, fields enumerated */}
      <Form.List path='links' label={t('links.label')}>
        {(item) => (
          <Form.List.Item>
            <Form.Field path={item.path('url')} />
            <Form.List.Remove />
          </Form.List.Item>
        )}
        <Form.List.Add />
      </Form.List>
    </Form.FieldSet>
    <Form.ErrorText />
  </Form.Content>
  <Form.Actions>
    <Form.Cancel />
    <Form.Submit />
  </Form.Actions>
</Form.Root>
```

### Nested forms, both kinds

```tsx
// The page is a form with no schema of its own: it supplies the modes and the chrome.
<Form.Root variant='settings' readonly={!canEdit}>
  <Form.Viewport>
    <Form.Content>
      {/* Independent: its own schema, values and persistence; the page's variant reaches it. */}
      <Form.Root schema={ClientSettingsSchema} values={client} onValuesChanged={setClient} autoSave>
        <Form.FieldSet label={t('client.label')} />
      </Form.Root>

      {/* Bound sub-tree: shares the enclosing model and validation, rooted at `runtime.client`. */}
      <Form.Root schema={RuntimeSchema} values={runtime} onValuesChanged={setRuntime}>
        <Form.FieldSet label={t('runtime.label')}>
          <Form.Root path='client'>
            <Form.FieldSet label={t('runtime.client.label')} collapsible />
            <Form.Field path='storage.persistent' /> {/* resolved against the nested root */}
          </Form.Root>
        </Form.FieldSet>
      </Form.Root>
    </Form.Content>
  </Form.Viewport>
</Form.Root>
```

## Where the code is today

The current tree, and how far each part is from the ontology:

```text
Form.Root                              schema, values, validation, onValuesChanged (context)
└─ Form.Viewport
   └─ Form.Content
      ├─ Form.Section                  Fieldset named by an <h2> legend + description   → Form.FieldSet
      │  ├─ Form.FieldSet              schema-driven; FormFieldSetContainer is the fieldset, collapsible when nested
      │  │  └─ FormFieldDispatch       one per property; resolveFieldRenderer picks a renderer
      │  │     ├─ ArrayField           → Form.List
      │  │     ├─ Form.FieldSet        nested object (recurses)
      │  │     └─ <renderer>           each renders its own Form.Field with a render-prop child   → a control
      │  └─ Form.Field                 hand-written row: label + description + any control
      ├─ Form.Group                    styled div                                       → Form.FieldSet
      ├─ Form.Layout
      └─ Form.Actions › Form.Submit; Form.Error                                         → Form.ErrorText
```

`Form.Field` today has two branches decided by the type of `children`: a render-prop child with the
dispatcher's `getValue`/`getStatus` renders a `Field.Root` with field parts; element children render
a `div` with a `span` label, so the hand-written row's control is not labelled by its label. Of the
83 hand-written rows (38 files, 18 packages), 36 hold only buttons, 26 one control, 17 a readout or
picker, 3 several controls; 26 wrap their own `Field.Root` inside the row to get a wired control.
`Form.Section` has 68 sites and `Form.FieldSet` 86.

## Steps, each landable alone

1. `Form.Field` renders `Field.Root` in both branches, with `standalone` for rows without a single
   control. The 26 one-control rows drop their inner `Field.Root`.
2. `Form.Section` and `Form.Group` fold into `Form.FieldSet` (`label`, `description`, `collapsible`,
   depth from context); the section gap applies to direct fields.
3. The modes move to `Form.Root` context.
4. `useFormField` and `path` on `Form.Field`, `Form.FieldSet` and `Form.Root`; renderers become
   controls; the dispatcher renders the row; `ArrayField` becomes `Form.List`.
