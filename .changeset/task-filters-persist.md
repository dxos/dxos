---
'@dxos/echo-query': minor
'@dxos/plugin-tasks': minor
---

The task list's filter is remembered per device for each task set, and the status menu now reads and writes the query text's `status:` terms, so the menu and the text are one filter. `@dxos/echo-query` gains `matchesFilter`, which evaluates a built filter against an object in memory, and `parseEnumTerms`/`writeEnumTerms`, which read and write the terms on one enumerated property so a picker and the query text share one string; a `type:` term now matches objects whose type carries a version.
