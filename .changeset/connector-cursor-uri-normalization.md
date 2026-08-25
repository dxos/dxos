---
'@dxos/plugin-connector': patch
---

Fixed a bound mailbox (or calendar) still offering **Connect** instead of **Sync**. One ECHO object has several `echo:` EID spellings — canonical local `echo:///<id>`, legacy local `echo:/<id>` still present in persisted data, and qualified `echo://<spaceId>/<id>` — and `isCursorForTarget` compared a cursor's stored `spec.target` URI to a freshly-made ref as raw strings. A cursor written under one spelling never matched, so the binding read as absent: the connect action stayed (it hides once a cursor targets the object) and the sync action never appeared (it shows only then).

Both cursor predicates now compare entity ids via `EID`, which normalizes every spelling.
