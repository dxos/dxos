---
'@dxos/react-ui-form': minor
---

Breaking: an `ObjectPicker` rendered outside `Form.Root` now throws when its create form opens (`createSchema`). The create form renders its fields through the dispatcher `Form.Root` provides, and the picker no longer imports it. Pickers inside a form are unaffected.
