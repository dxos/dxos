---
'@dxos/react-ui-form': minor
'@dxos/react-ui': minor
'@dxos/effect': patch
'@dxos/types': patch
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

`@dxos/types` `Geo.PostalAddress` titles the fields whose keys read poorly as labels: City, State / Region,
Address line 2, Postal code and PO box. `@dxos/effect` `SchemaEx.getProperties` now keeps the annotations of an
annotated optional field (`Schema.optional(S).annotate(…)`), which it previously dropped along with the
`S | undefined` union.
