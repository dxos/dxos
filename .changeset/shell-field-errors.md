---
'@dxos/react-ui': patch
---

HALO and join dialog steps (identity input, profile form, reset confirmation) show their validation message again: the field is marked invalid whenever a message is present, which the field's error text requires before it renders.
