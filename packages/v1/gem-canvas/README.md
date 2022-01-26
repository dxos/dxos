# Canvas Editor

A light-weight diagram editor using D3 and SVG.


## Testing

```
yarn storybook
```

NOTE: Performance is slow if the browser Devtools are open.


## Bugs

- [ ] Round numbers/fractions.
- [ ] Multi-select.
- [ ] Frequent updates.


## Milestones

- [ ] Abstract model.
- [ ] Embed within document.
- [ ] App + CRDT model.


## Features

- [ ] Click text with text tool to edit.
- [ ] Connect handles for links.
- [ ] Drag to select (and cut).
- [ ] Fractions for user space coordinates (just round to nearest unit?)
- [ ] Path connection points.
- [ ] Object Properties (arrows, curves); vector of points (shape-specific properties).
- [ ] Multi-select and move.
- [ ] Layout data structure (separate from data).
- [ ] Load/save SVG.
- [ ] Animate between scenes (different level of detail, layout: e.g., simulation within node).
- [ ] Data properties editor (DxOS app).


## Done

- [x] Object order.
- [x] Text
- [x] Drag to create.
- [x] Separate monorepo.
- [x] Snap doesn't work when zoomed.
- [x] Paths.
- [x] Toolbar (shape, color)
- [x] Shapes rect/circle.
- [x] Move drag handler to objects (from controller).
- [x] Objects with layout/renderer, selection.
- [x] Key shortcuts.
- [x] Create object.
- [x] Delete.
- [x] Copy/paste.


## Refs

- https://github.com/romsson/d3-gridding
