---
'@dxos/plugin-kanban': patch
---

The "Pivot column" select in the Create Kanban dialog lists the single-select fields of the chosen card type again. It was empty for every type, including Task and Organization, because the card type picker supplies a type URI and the pivot field looked the type up by bare typename.
