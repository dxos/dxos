---
'@dxos/react-ui-form': minor
'@dxos/react-ui-markdown': patch
---

The form ontology: three parts that map one for one onto `@dxos/react-ui`'s `Field` and `Fieldset`, with binding, semantics and layout kept apart.

- **Breaking:** `Form.Field` is one `Field.Root` row whether bound or not. With `path` it is bound: label, description, value and error come from the schema and the model, and with no children the dispatcher picks the control; a hand-written control inside reads the binding with `useFormField()`. Without `path` it takes `label`, `description` and `error` (a string; was `validation`, a node) as props and its children are the control, which the row's label now names. `standalone` says the row holds no single control (a button, a readout). The render-prop form of `children` is gone.
- **Breaking:** `Form.FieldSet` is the one grouping element: a `<fieldset>` with `label`, `description` and `collapsible`, chrome by depth (a top-level field set is a titled section, a nested one an indented group). It walks nothing. `Form.Section` (`title` → `label`) and `Form.Group` are removed.
- **New:** `Form.Fields` walks the schema at a `path` with `include`, `exclude`, `sort` and `filter`, rendering a `Form.Field` per property and a `Form.FieldSet` around a nested object. What `<Form.FieldSet />` used to do is now `<Form.FieldSet label><Form.Fields /></Form.FieldSet>`.
- **Breaking:** the built-in renderers (`TextField`, `SelectField`, …) are controls with no row of their own; a `fieldMap` or `fieldProvider` renderer owns its row and writes `<Form.Field path={jsonPath}>` around its control. `Form.Error` is `Form.ErrorText`. `FormFieldHeader` no longer takes `path`.
- `MarkdownView` spreads its remaining props and accepts `className`, so a parent can render it `asChild`.
