---
'@dxos/echo': patch
---

In-memory typed objects use about 4× less heap when they hold deeply nested values, such as an operation record's JSON Schema. Each nested record used to get its own instance-state prototype, and its metadata was deleted off the target. Both changes put the record into V8's dictionary mode, at about 0.5 KiB per record. Nested records now share one behaviour prototype and keep their metadata as own properties. The inspector is now one shared function, on that prototype and on each array, where it used to be a function bound per record. Nested records no longer carry a deletion marker. Measured on 147 real plugin operations, `Operation.serialize` now retains 15 KiB per record, down from 68 KiB.
