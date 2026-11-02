---
'@dxos/echo-client': patch
---

Integrating a host update and acknowledging a local write no longer look up every head's change by hash, which cost up to ~200 µs per update on documents with concurrent edits.
