---
'@dxos/echo': minor
'@dxos/echo-protocol': minor
'@dxos/echo-host': minor
'@dxos/index-core': minor
'@dxos/schema': minor
'@dxos/plugin-space': minor
'@dxos/plugin-projects': minor
'@dxos/app-toolkit': minor
'@dxos/compute': minor
'@dxos/assistant': minor
---

Projects and chat sessions can be archived. An archived object leaves the navigation tree but stays
listed in the space's Database section, where its card shows an "Archived" badge and an Unarchive
action. Types opt in with `ArchivableAnnotation`; the archive state is `ArchivedAnnotation` in the
object's meta. `Filter.annotation(annotation, value?)` queries any meta annotation, in memory and
in SQL.
