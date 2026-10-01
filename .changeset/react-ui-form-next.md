---
'@dxos/react-ui-form': minor
'@dxos/react-ui': minor
---

`@dxos/react-ui-form/next` is a new subpath export: the `Form` namespace (`Root`, `Viewport`, `Content`, `FieldSet`,
`Fields`, `Field`, `Actions`, `Submit`, `ErrorText`), `createSelectField` and the field renderers, built on
`@dxos/react-ui/next` with the current Form's contract. `@dxos/react-ui/next` gains:

- `Field.Root layout='row'` and `level`, for settings rows;
- `Fieldset.Root gutter='inherit'`, `level` and `inset`, for grid sets and nested groups;
- `Collapsible.Content gutter='inherit'`;
- `Container align`;
- `Input variant='mono'`;
- a shared end-cell column for trailing icons.
