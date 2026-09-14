---
'@dxos/react-ui': minor
---

`@dxos/react-ui`'s `Input` is `Field`, forms group their fields in real fieldsets, and popovers stay put.

**`@dxos/react-ui` — Breaking:** `Input` is `Field`, named for what it is (Ark's `Field` plus the standard form of each control), with its parts named as Ark names them:

- `Input.Root` → `Field.Root`, `Input.Label` → `Field.Label`, `Input.Description` → `Field.HelperText`, `Input.Validation` → `Field.ErrorText`, `Input.TextInput` → `Field.Input`, `Input.TextArea` → `Field.Textarea`; `Checkbox`, `Switch`, `PinInput`, `Date`, `DateTime`, `Time`, `Block` and `TriggerIcon` keep their names under `Field`.
- `Input.DescriptionAndValidation` is gone: `Field.HelperText` is always the field's helper text and `Field.ErrorText` its error text, so a description and an error are two siblings rather than one paragraph that changed role with the valence.
- Types and hooks follow: `InputRootProps` → `FieldRootProps`, `TextInputProps` → `InputProps`, `TextAreaProps` → `TextareaProps`, `InputValence` → `FieldValence`, `useInputValence` → `useFieldValence`, `useInputTrigger` → `useFieldTrigger`. The theme key `input` is `field`.
- `Field.Checkbox` and `Field.Switch` accept label children: the control renders as a `<label>` around itself and the text, so a labelled control is one element at the call site instead of a hand-built row of `Field.Root`, `Flex`, the control and `Field.Label`.
- `Fieldset.Legend` is floated so it lays out as an ordinary child (a flex item in a flex fieldset) while still naming the group.
- **Breaking:** the `DropdownMenu` and `ContextMenu` namespaces are gone; both were `Menu`. `DropdownMenu.X` → `Menu.X`, `ContextMenu.Trigger` → `Menu.ContextTrigger`, `ContextMenu.X` → `Menu.X`; the `DropdownMenu*Props`/`ContextMenu*Props` type aliases → `Menu*Props`, `useDropdownMenuContext` → `useMenuContext`. Stories are `components/Menu` and `components/Menu/ContextTrigger`.
- A popover, menu, select or tooltip no longer flashes at the viewport's origin on the frame before it is measured, and content anchored to a virtual element (`Popover.VirtualTrigger`, the editor's `dx-anchor` menus) follows the anchor when its container scrolls.

**`@dxos/react-ui-form`:** groups in a form are real fieldsets, and the form's field components are named for what they are.

- `Form.Section` and every schema group (`Form.FieldSet`, nested objects, object-array items, inline refs) render a `<fieldset>` named by its `<legend>`, so assistive technology announces the group. A nested group's legend holds its disclosure. `Form.Section`'s legend was inside a header `div` and never named the section.
- **Breaking:** `Form.Row` is `Form.Field` (`FormRow` → `FormField`, `FormRowProps` → `FormFieldProps`): one label + control is a field. The former `FormField`, the schema-driven factory that picks a renderer per property, is `FormFieldDispatch`, with the decision extracted as the pure `resolveFieldRenderer`.
