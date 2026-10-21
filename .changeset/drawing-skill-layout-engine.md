---
'@dxos/plugin-illustrator': patch
'@dxos/plugin-debug': patch
---

The Drawing skill lays out boxes-and-arrows diagrams with the semantic diagram engine: an agent states the boxes, arrows and groups and the engine places them and routes the arrows, instead of the agent positioning every box itself, which left boxes and labels overlapping. The Hello Worker template binds the Drawing skill to its project and asks for its architecture diagram in that language.
