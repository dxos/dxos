---
'@dxos/plugin-space': minor
---

The Related Objects companion now filters by type: its toolbar offers one toggle per type actually present in the related set, labelled with the type's own icon, label and count, and hidden entirely when there is nothing to narrow. The choice is per-record view state, so the record article's inline Related section — which has no toolbar of its own — narrows with it.

This replaces the hardcoded exclusion of `org.dxos.type.text` and `org.dxos.type.assistant.chat` from related results; both types are now shown and can be filtered out by the user. Types annotated hidden remain excluded and are never offered as an option. A related-object list no longer includes the subject itself.
