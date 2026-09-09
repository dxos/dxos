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
row and the group and `@dxos/react-ui`'s `Field`/`Fieldset` stay primitives, with the names mapping
one for one: `Form.Field` is a `Field`, `Form.FieldSet` is a `Fieldset`. Walking the schema is a
third part, `Form.Fields`, which renders no element, so no component's behaviour depends on whether
it was given children. A form built by hand is `Form.FieldSet`s of `Form.Field`s and never mentions
`Form.Fields`; the walker appears only where the schema should supply the fields, and a mixed form
uses both inside one field set. Paths are written from the enclosing `Form.Root`; `Form.Fields path`
walks a sub-object, and `Form.Root path` re-roots paths only to embed a component written against
a sub-schema.

| Component        | Built from                                                                                  | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Form.Root`      | nothing (a scope; only the outermost with `onSave` renders `<form>`)                        | The model boundary: `schema?`, `values`/`defaultValues`, `onValuesChanged`, `onSave`, `autoSave`, and the modes as context (`readonly`, `presentation`, `variant`). Nests two ways: with its own `schema` + `values` it is an independent form embedded in another; with `path` it re-roots the paths inside it at a sub-object of the enclosing model, so a component written against a sub-schema can be mounted anywhere. Paths are otherwise always written from the enclosing root. |
| `Form.Viewport`  | `ScrollArea`                                                                                | The scroll region.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Form.Content`   | nothing                                                                                     | The measure and gutter inside the viewport: the bounded surface the scroll region lives in, as Popover's `Content` is to its `Viewport`.                                                                                                                                                                                                                                                                                                                                                 |
| `Form.FieldSet`  | `Fieldset.Root` + `Legend` + `HelperText` + `ErrorText`; `Collapsible.*` when `collapsible` | Presentation and semantics only: `label`, `description`, `collapsible`, `bordered`, with depth chrome from context (a top-level legend is a heading with the section gap, a nested one a plain legend with an indented body). Wraps anything: fields, walkers, other field sets, hand-written rows. No `path`, no enumeration.                                                                                                                                                           |
| `Form.Fields`    | nothing                                                                                     | The walker: `path?`, `include`, `exclude`, `sort`, `filter`, resolved against the enclosing scope. Renders a `Form.Field` per property and, for a nested object, a `Form.FieldSet` (label from the schema title, collapsible) around a `Form.Fields` at that path.                                                                                                                                                                                                                       |
| `Form.Field`     | `Field.Root` + `Label` + `HelperText` + `ErrorText` + the control                           | The leaf, always a real field. With `path` it is bound: label, description, value, error, required and readonly come from the schema and model, and with no children the dispatcher picks the control. Without `path` it takes `label`/`description`/`error` as props and its children are the control. `standalone` for a row with no single control (a button, a readout).                                                                                                             |
| `Form.List`      | `Fieldset.Root` + `Legend`; items are `Form.FieldSet` / `Form.Field`                        | The repeating group (an array property): `path`, an item template, `Form.List.Item` with move and remove, `Form.List.Add`. Ark has no repeater; this is the one form-specific structure.                                                                                                                                                                                                                                                                                                 |
| `Form.Layout`    | nothing                                                                                     | Visual arrangement with no semantics: columns, inline pairs, the parsed layout spec. Used inside a field set, never in place of one.                                                                                                                                                                                                                                                                                                                                                     |
| `Form.Actions`   | nothing (`Dialog.ActionBar` is the sibling)                                                 | The action row: `Form.Submit`, `Form.Cancel`, `Form.Reset`.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Form.ErrorText` | `Fieldset.ErrorText` on the root                                                            | The form-level error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Deliberately absent: `Positioner` and `Arrow` belong to floating surfaces and never appear here (a
date picker's popover is inside its control); `Form.Section` and `Form.Group` are `Form.FieldSet`;
the built-in renderers (`TextField`, `DateField`, `RefField`, …) are controls the dispatcher places
in a `Form.Field`, not rows of their own. A renderer the form supplies (`fieldMap`, `fieldProvider`)
is the one exception: it owns its row, because what it customises is usually the row (a description,
a `labelEnd` readout, several controls), so it writes `<Form.Field path={jsonPath}>` around its
control and gets the schema's label and description for free. A control declares its shape rather than
its chrome: `standalone` (several labelled inputs, so the row's label is text) and `labelPlacement:
'beside'` (a toggle, so the row lays its label after the control on one line). The theme decides what
a declaration means per variant: the settings card keeps its grid, so a toggle there still has its
label and description on the left and the switch on the right. The dispatcher, `FormFieldDispatch`, maps a schema property to a control through
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
      <Form.FieldSet label={t('deck.label')} description={t('deck.description')}>
        <Form.Fields exclude={['hue']} />
      </Form.FieldSet>
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

The first field set holds the walker; the second is hand-written, but the bound
`Form.Field path='hue'` still takes its label and description from the schema. The simplest form is
`<Form.Root schema values><Form.Fields /></Form.Root>`, with no field set at all.

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
      <Form.FieldSet label={t('address.label')} collapsible>
        {/* One field of the nested object placed by hand, then the rest of it. */}
        <Form.Field path='address.street' />
        <Form.Fields path='address' exclude={['street']} />
      </Form.FieldSet>
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
        <Form.FieldSet label={t('client.label')}>
          <Form.Fields />
        </Form.FieldSet>
      </Form.Root>

      {/* A sub-object walked and one of its fields placed by hand: paths are always from the root. */}
      <Form.Root schema={RuntimeSchema} values={runtime} onValuesChanged={setRuntime}>
        <Form.FieldSet label={t('runtime.label')}>
          <Form.FieldSet label={t('runtime.client.label')} collapsible>
            <Form.Fields path='client' exclude={['storage']} />
          </Form.FieldSet>
          <Form.Field path='client.storage.persistent' />
        </Form.FieldSet>
      </Form.Root>

      {/* Embedding: `AddressFields` was written against `AddressSchema` and says `street`; the
          parent mounts it at `address`. `Form.Root path` exists for this reuse, not for layout. */}
      <Form.Root schema={ContactSchema} values={contact} onValuesChanged={setContact}>
        <Form.Root path='address'>
          <AddressFields />
        </Form.Root>
      </Form.Root>
    </Form.Content>
  </Form.Viewport>
</Form.Root>
```

### Two sets over one model, one shown on demand

```tsx
<Form.Root schema={SettingsSchema} values={settings} onValuesChanged={setSettings}>
  <Form.FieldSet label={t('basic.label')}>
    <Form.Fields exclude={['proxy', 'timeout']} />
  </Form.FieldSet>
  {showAdvanced && (
    <Form.FieldSet label={t('advanced.label')}>
      <Form.Fields include={['proxy', 'timeout']} />
    </Form.FieldSet>
  )}
</Form.Root>
```

Showing and hiding never changes the model or its validation: a required property in a hidden set
still fails validation, and a form that wants a hidden section to be optional says so in the schema.
`exclude` is explicit rather than "whatever the siblings did not render": the implicit form needs
fields to register before the walker renders, which costs a render pass and makes the output depend
on sibling order.

## As built (2026-09-08)

```text
Form.Root                              schema, values, validation, modes (context)
└─ Form.Viewport
   └─ Form.Content
      ├─ Form.FieldSet                 Fieldset.Root + Legend (+ HelperText, Collapsible.*); chrome by depth
      │  ├─ Form.Fields                walks the schema at a path; renders no element
      │  │  └─ FormFieldDispatch       one per property: resolveFieldRenderer picks a control, then
      │  │     └─ Form.Field (row)     FormFieldRow = Field.Root + Label + HelperText + control + ErrorText
      │  │        ├─ <control>         TextField, SelectField, … — controls only; `standalone` for several inputs
      │  │        ├─ ArrayField        a group with its own header (future Form.List)
      │  │        └─ Form.FieldSet     a nested object: label from the schema, collapsible, around Form.Fields
      │  └─ Form.Field                 hand-written: `path` binds it, else label/description/error props
      ├─ Form.Layout
      └─ Form.Actions › Form.Submit; Form.ErrorText
```

`Form.Field` routes: `path` with no children → the dispatcher; `path` with children → a bound row
whose control reads `useFormField()`; no `path` → an unbound row. A `fieldMap`/`fieldProvider`
renderer owns its row (`<Form.Field path={jsonPath}>` around its control). Not yet built:
`Form.List`, `Form.Root path`, and the modes moving off the renderer props onto context.

## Remaining steps

1. The modes (`readonly`, `presentation`, `hideEmpty`) move off the renderer props onto `Form.Root`
   context.
2. `Form.Root path`, for embedding a component written against a sub-schema.
3. `ArrayField` becomes `Form.List` (`Item`, `Add`, `Remove`).
