---
'@dxos/react-ui-canvas': minor
---

Pointing at a scene view's floating panel, or at a popup it opens, no longer highlights the shapes beneath it.

A `Combobox` popup with a search field now frames the field above a separate scrolling list, so options no longer scroll beneath it and the scrollbar starts below it; a create form that replaces the search keeps the same frame. Typing and pressing Enter in the same frame now picks the first match: the highlight moves off a filtered-out option as the list narrows rather than an effect later.

`@dxos/app-toolkit/ObjectCombobox` picks one object of a space: the objects a user finds in the navigator or a Database section (`TypeOptions.filterListedObjects`: a registered user-facing type, not archived, not a space's root collection), sorted by label, each with its type icon, an unnamed object under its type's placeholder. `ObjectCombobox.toOptions` builds the same options for a form's ref field, which the canvas's object picker now uses. `RefOption` takes an optional `icon` and `iconHue`, which `ObjectPicker` renders at the start of the row.

app-toolkit's UI components each live in their own folder, whose module is the namespace its subpath exports (as `@dxos/react-ui` does), replacing the root re-export shims; the subpaths and the namespaces they export are unchanged.
