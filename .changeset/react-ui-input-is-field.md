---
'@dxos/react-ui': minor
---

**Breaking:** `Input` is `Field`, named for what it is (Ark's `Field` plus the standard form of each control), with its parts named as Ark names them:

- `Input.Root` → `Field.Root`, `Input.Label` → `Field.Label`, `Input.Description` → `Field.HelperText`, `Input.Validation` → `Field.ErrorText`, `Input.TextInput` → `Field.Input`, `Input.TextArea` → `Field.Textarea`; `Checkbox`, `Switch`, `PinInput`, `Date`, `DateTime`, `Time`, `Block` and `TriggerIcon` keep their names under `Field`.
- `Input.DescriptionAndValidation` is gone: `Field.HelperText` is always the field's helper text and `Field.ErrorText` its error text, so a description and an error are two siblings rather than one paragraph that changed role with the valence.
- Types and hooks follow: `InputRootProps` → `FieldRootProps`, `TextInputProps` → `InputProps`, `TextAreaProps` → `TextareaProps`, `InputValence` → `FieldValence`, `useInputValence` → `useFieldValence`, `useInputTrigger` → `useFieldTrigger`. The theme key `input` is `field`.
- `Field.Checkbox` and `Field.Switch` accept label children: the control renders as a `<label>` around itself and the text, so a labelled control is one element at the call site instead of a hand-built row of `Field.Root`, `Flex`, the control and `Field.Label`.
