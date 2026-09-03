---
'@dxos/plugin-projects': patch
---

Reduce re-renders in the project and task-set articles: subscribe to ref-list membership instead of whole objects, and resolve owned refs (instructions, outline, task set, artifacts) without tracking their mutations.
