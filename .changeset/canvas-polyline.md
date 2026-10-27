---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
---

ECHO adds content migrations for formats stored inside an object field: `Annotation.ContentVersionAnnotation` marks the field holding the version, `Migration.defineContent` declares one step, `db.runMigrations` applies each object's chain once, writing only the records that change, and `Migration.upgradeContent` applies it in memory. The canvas is the first user: every stored drawing moves from `dxos.org/scene/1` to `dxos.org/scene/2` on first start (a frame's `role` moving into its `link`), so a client on an earlier release cannot open a migrated drawing until it updates, and from this release a drawing saved by a newer Canvas plugin opens read-only. The canvas also gains a polyline shape and tool (Y) and a per-type edit mode entered by double-click (a label, or a polyline's draggable vertices), and Rounded and line style now draw the same on every shape.

Breaking: `CanvasAtoms.editing` is an `Editing` union replacing `EditingPart`; the lattice snap toggle (`CanvasAtoms.lattice`, `toggleLattice`, Shift+G) is removed, since a lattice scene always snaps to its cells and shows no grid; and drawing variants match a canvas by format rather than by exact version string.
