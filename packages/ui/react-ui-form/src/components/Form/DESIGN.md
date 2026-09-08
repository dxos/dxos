# `@dxos/react-ui-form` — Design

Schema-driven forms. Give `Form.Root` an Effect `schema` + `values`; the field set renders typed
controls automatically. Bespoke controls drop in via `Form.Field` or a per-path `fieldMap`.

Naming, one level each: a **field set** (`Form.FieldSet`, a `<fieldset>`) holds **fields**
(`Form.Field`, one label + control); `FormFieldDispatch` is the factory that picks a field's renderer
from the schema, and the renderers themselves live in `FormField/fields/*Field`.

## Component hierarchy

````text
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

## Where this goes: one ontology, three layers

`Form.Field` does three jobs today, and which it does is decided by the type of its `children`:

1. **Binding** — reading a value and its validation status out of the form model at a JSON path
   (a render-prop child plus `getValue`/`getStatus` from the dispatcher).
2. **Semantics** — the label, helper-text and error-text association: what Ark's `Field` is.
3. **Layout** — the settings card grid, the presentation modes, the required mark, `labelEnd`.

"Field mode" is all three; "action mode" (element children) is layout only, so a hand-written
settings row is a card with a label that no control is labelled by, and 26 of the 83 such rows wrap
their own `Field.Root` inside the card to get a wired control, which yields a field with no label
inside a card that has one. The distinction that is real is only the first one — whether the row's
source of truth is the form model or state the caller owns — and it must never decide the other two.

Decided 2026-09-08: the revised ontology below. `Form.Field` and `Form.FieldSet` are what a consumer
writes in every case, bound or not, so `@dxos/react-ui-form` owns the row and the group and
`@dxos/react-ui`'s `Field`/`Fieldset` stay primitives; both `Form.Root` and `Form.FieldSet` take a
`path`.

### Components

Fixed points: `Form.Root` is the outer scope, with or without a schema, and forms nest; the leaves
are fields; fields are grouped by field sets, which carry their own label. Everything else follows
from keeping binding, semantics and layout apart.

| Component | Built from | Role |
| --- | --- | --- |
| `Form.Root` | nothing (a scope; only the outermost with `onSave` renders `<form>`) | The model boundary: `schema?`, `values`/`defaultValues`, `onValuesChanged`, `onSave`, `autoSave`, and the modes as context (`readonly`, `presentation`, `variant`). Nests two ways: with `path` it binds a sub-tree of the enclosing model and shares its validation; with its own `schema` + `values` it is an independent form embedded in another. |
| `Form.Viewport` | `ScrollArea` | The scroll region. |
| `Form.Content` | nothing | The measure and gutter inside the viewport (readable width, padding): the bounded surface the scroll region lives in, as Popover's `Content` is to its `Viewport`. |
| `Form.FieldSet` | `Fieldset.Root` + `Legend` + `HelperText` + `ErrorText`; `Collapsible.*` when `collapsible` | The one grouping element, at any depth: `label`, `description`, `collapsible`, `path?`. With `path` it binds an object property (label from the schema title) and, with no children, enumerates its fields (`exclude`, `sort`, `filter`). Depth styling comes from context: a top-level legend is a heading with the section gap, a nested one a plain legend with the indented body. Replaces `Form.Section`, the container half of today's `Form.FieldSet`, and the `div` `Form.Group`. |
| `Form.Field` | `Field.Root` + `Label` + `HelperText` + `ErrorText` + the control | The leaf, always a real field. With `path` it is bound: label, description, value, error, required and readonly come from the schema and model, and with no children the dispatcher picks the control. Without `path` it is unbound and takes `label`/`description`/`error` as props; children are the control, wired by the caller. `standalone` for a row with no single control. |
| `Form.List` | `Fieldset.Root` + `Legend`; items are `Form.FieldSet` / `Form.Field` | The repeating group (an array property): `path`, an item template, `Form.List.Item` with move and remove, `Form.List.Add`. Today's `ArrayField`, made a part. Ark has no repeater; this is the one form-specific structure. |
| `Form.Layout` | nothing | Visual arrangement with no semantics: columns, inline pairs, the parsed layout spec. Used inside a field set, never in place of one. |
| `Form.Actions` | nothing (`Dialog.ActionBar` is the sibling) | The action row: `Form.Submit`, `Form.Cancel`, `Form.Reset`. |
| `Form.ErrorText` | `Fieldset.ErrorText` on the root | The form-level error. Today's `Form.Error`. |

Deliberately absent: `Positioner`, `Content`-as-floating-surface and `Arrow` belong to floating
components and never appear here (a date picker's popover is inside its control); `Section` and
`Group` collapse into `FieldSet`; the renderers stop being components with a shell and become
controls the dispatcher places in a `Form.Field`.

Bound and unbound are layers, not modes: a row or group is bound when it has a `path` (or sits
under a `Form.Root path`), and its parts read the binding through one hook (`useFormField`); the
same row without a path is unbound and its caller wires the control. Nothing in the row's rendering
differs between the two.

### Example 1: a schema-driven settings panel with one custom control and one unbound row

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

### Example 2: an edit dialog with a nested object, a list and actions

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

### Example 3: nested forms, both kinds

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

### Unbound rows today

83 sites in 38 files across 18 packages write the unbound form (36 hold only buttons, 26 one
control, 17 a readout or picker, 3 several controls, 1 self-closing); `Form.Section` has 68 sites
and `Form.FieldSet` 86, and 28 files use a section with no schema field set inside.

### Steps, each landable alone

1. The row is always a `Field.Root`, with `standalone` for rows without a single control. Closes
   the two gaps the mapping table shows; the 26 one-control rows drop their inner `Field.Root`.
2. `Form.Section` and `Form.Group` fold into `Form.FieldSet` (`label`, `description`,
   `collapsible`, depth from context); the section gap applies to direct fields.
3. The modes move to `Form.Root` context.
4. `useFormField` and `path` on `Form.Field`/`Form.FieldSet`/`Form.Root`; renderers become
   controls; the dispatcher renders the row; `ArrayField` becomes `Form.List`.
````
