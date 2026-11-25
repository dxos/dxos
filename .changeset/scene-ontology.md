---
'@dxos/scene': minor
'@dxos/plugin-canvas': minor
---

Breaking: a stored drawing uses one set of names. `kind` tells an element, a node and a model object apart (every link is `kind: 'link'` with a `path`); a style states `color`, `fill`, `stroke`, `corners`, `font`, `align` and `valign` in 2D and 3D alike; a colour is one string (`blue`, `blue/2`, `#1e90ff`) and a font is a slot of the theme, which may define named colours and typefaces; a port is a point of its node's frame. A stored element is the node or link itself, with no `props.canvas`: layouts, models and style catalogs move to version 0.2.0, and plugin-canvas migrates a drawing stored at 0.1.0 when its space loads. `@dxos/scene` also exports `Ontology`, the registry of every schema of a stored drawing, from which `moon run scene:gen-ontology` writes `ontology.schema.json` and the docs page.

In the 3D editor the select-all chord selects every element of the open layout, a selection's box stays round its element while it is dragged, the scale tool sizes an element in step with its handle's travel, and the inspector panel's titles and labels no longer select as text.
