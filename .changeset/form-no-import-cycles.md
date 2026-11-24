---
'@dxos/react-ui-form': patch
---

`ObjectPicker` rendered outside a form now throws when its create form opens (`createSchema`), since only a form can render the create form's fields.
