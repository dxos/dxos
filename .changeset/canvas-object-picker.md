---
'@dxos/react-ui-canvas': minor
---

Pointing at a scene view's floating panel, or at a popup it opens, no longer highlights the shapes beneath it. Object pickers can show each object's icon: `RefOption` takes an optional `icon` and `iconHue`, which `ObjectPicker` renders at the start of the row. `TypeOptions.filterListedObjects` keeps only the objects a user finds in the navigator or a Database section (a registered user-facing type, not archived, not a space's root collection), for pickers to offer instead of every object in the space; the canvas's object picker lists them sorted by label, an unnamed object under its type's placeholder (as the navigator shows it).
