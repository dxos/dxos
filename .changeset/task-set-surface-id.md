---
'@dxos/plugin-markdown': patch
---

Fix the TaskSet article and section surfaces never rendering (the Tasks section of a Project article was empty), and the Excalidraw plugin settings surface never rendering — both surface ids ended in a hyphenated segment, which the surface manager drops.
