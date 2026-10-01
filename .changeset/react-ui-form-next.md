---
'@dxos/react-ui-form': minor
'@dxos/react-ui': minor
'@dxos/effect': patch
'@dxos/types': patch
'@dxos/echo': minor
---

`@dxos/react-ui-form/next` is a new subpath export: the `Form` namespace (`Root`, `Viewport`, `Content`, `FieldSet`,
`Fields`, `Layout`, `Field`, `Actions`, `Submit`, `ErrorText`), `createSelectField`, the field renderers (including
`MarkdownField` and `RefArrayField`), `ObjectPicker`, `ObjectMultiPicker`, `ObjectForm`, `ObjectProperties`, `ViewEditor`, `FieldEditor` and `RefEditor`,
built on `@dxos/react-ui/next` with the current Form's contract. The root export adds `useRefEditor`, the current
`RefEditor`'s behaviour without its chrome. `@dxos/react-ui/next` gains:

- `Field.Root layout='row'` and `level`, for settings rows;
- `Fieldset.Root gutter='inherit'`, `level` and `inset`, for grid sets and nested groups;
- `Collapsible.Content gutter='inherit'`;
- `Container align`;
- `Input variant='mono'`;
- a shared end-cell column for trailing icons;
- `ControlFrame rows`, a multi-line frame, and a focus ring that follows focus nested in its content;
- `Combobox.Content` focusing a field composed into it (an inline create form);
- `Combobox.Root createLabel` and `createIcon` for the create row, and `Combobox.Control wrap` for a multiple
  selection's chips.

`@dxos/types` `Geo.PostalAddress` titles the fields whose keys read poorly as labels: City, State / Region,
Address line 2, Postal code and PO box. `@dxos/effect` `SchemaEx.getProperties` now keeps the annotations of an
annotated optional field (`Schema.optional(S).annotate(…)`), which it previously dropped along with the
`S | undefined` union.

`@dxos/echo` adds `Annotation.ArrayPresentationAnnotation` (`ordered`, `display: 'tag' | 'title'`, `description`), which
`@dxos/react-ui-form/next` reads to present arrays of references as chips or title rows.
