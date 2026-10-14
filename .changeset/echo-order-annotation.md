---
'@dxos/echo': minor
---

Add `Order.annotation(annotation, direction, path?)`, which orders query results by an entity annotation's value (or a scalar inside a struct-valued annotation) with unannotated entities last, so queries can be paged by annotation with `.limit()`/`.skip()` and `usePagination`.
