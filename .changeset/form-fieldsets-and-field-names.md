---
'@dxos/react-ui-form': minor
---

Groups in a form are real fieldsets, and the form's field components are named for what they are.

- `Form.Section` and every schema group (`Form.FieldSet`, nested objects, object-array items, inline refs) render a `<fieldset>` named by its `<legend>`, so assistive technology announces the group. A nested group's legend holds its disclosure. `Form.Section`'s legend was inside a header `div` and never named the section.
- **Breaking:** `Form.Row` is `Form.Field` (`FormRow` → `FormField`, `FormRowProps` → `FormFieldProps`): one label + control is a field. The former `FormField`, the schema-driven factory that picks a renderer per property, is `FormFieldDispatch`, with the decision extracted as the pure `resolveFieldRenderer`.
- `@dxos/react-ui`'s `Fieldset.Legend` is floated so it lays out as an ordinary child (a flex item in a flex fieldset) while still naming the group.
