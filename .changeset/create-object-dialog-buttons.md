---
'@dxos/react-ui-form': patch
---

The create-object dialog now has Cancel and Create buttons, and pressing Enter in a single-line field
creates the object (Escape still cancels). `@dxos/react-ui-form` exports `useSubmitOnEnter`, which gives any
form a native form's implicit Enter submission without touching multi-line fields.
