---
'@dxos/echo-panproto': patch
---

`Lens.register` returns its argument's precise type, so a registered coded lens can be annotated without reaching for the internal `Lens` type.
