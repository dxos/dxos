---
'@dxos/plugin-projects': minor
'@dxos/react-ui-mosaic': patch
---

A project's Features tab gains a Kanban view: a column per feature status, and dragging a card to another column sets that feature's status through `FeatureOperation.Update`. `Board.Column.Body` in react-ui-mosaic is generic over its item, so a board of plain records can pass a typed tile.
