---
'@dxos/util': patch
'@dxos/app-graph': patch
'@dxos/schema': patch
'@dxos/app-framework': patch
---

`shallowEqual` moves to `@dxos/util`. It had three separate implementations (`app-graph`, `schema`, and the one `Surface` added), and only one of them was correct.

The two older copies compared `Object.keys` alone. `Object.keys` omits an array's `length` and skips its holes, so both treated `[]` as equal to `{}` and `new Array(1)` as equal to `[]`. The shared version compares array-ness and length first. `app-graph` runs this over `node.data` and `node.properties` when deciding whether a node changed, so a node whose data went from `{}` to `[]`, or whose array grew a trailing hole, was previously seen as unchanged.
