---
'@dxos/echo': patch
---

`Annotation.atom` and `Annotation.atomProperty` snapshot the value at every depth, so a record nested in an annotation and changed in place reaches readers as a new value.
