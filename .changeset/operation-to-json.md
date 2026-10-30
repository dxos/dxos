---
'@dxos/compute': minor
---

Add `Operation.toJSON`, which returns the JSON of an operation's persistent record (with an id derived from its key and version) without building the ECHO object. `Operation.serialize` no longer adopts the definition's `meta.annotations` object into the record it returns.
