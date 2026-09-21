---
'@dxos/plugin-projects': patch
---

Creating a project now persists its scaffolded task set, outline and instructions. On a remote operation host the create returned a project whose children had never been written, leaving refs that could not be resolved or updated.
