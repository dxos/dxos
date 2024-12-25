# @dxos/plugin-canvas

## Ontology

- The `Graph` represents the data structure, consisting of extensible `GraphNode` and `GraphEdge` elements. 
- Like a `View`, it may be a projection of underlying ECHO objects.
- The `Editor` manages a `GraphModel<GraphNode<Shape>>`, which implements a graph of `Shape` nodes.
- `Shape` nodes can be generic extensions (e.g., `RectangleShape`, `EllipseShape`, `PathShape`), 
  or more customized components (e.g., `FunctionShape`).
- Each `Shape` may have a reference to an external data object, from which it may derive properties.

## Phase 1: Basic editor
- [x] Canvas with pan and zoom (`@dxos/react-canvaas`).
- [x] General graph data structure (`@dxos/graph`).
- [x] Radix-style Editor component, with Canvas, Grid and Toolbar.
- [x] Actions and key shortcuts.
- [x] Basic shapes: Polygons and Paths.
- [x] Automatic layout.
- [x] Path animations (bullets).
- [x] Form properties.
- [ ] Copy/paste.
- [ ] Basic persistence (Graph should be passed an ECHO object, not recreate one).
- [ ] Grid bug when in Composer.
- [ ] Move all selected.
- [ ] Undo/redo (history).
- [ ] Snap to edges or center? (currently center).

## Phase 2: 
- [x] FunctionShape components with properties and anchor points. Add/delete and Play buttons.
- [ ] Auto-size.

## Phase 3:
- [ ] Group/collapse nodes; hierarchical graph editor. 

### Technical Debt
- [ ] Reconcile Graph with framework (ECHO, app-graph, etc.)
- [ ] Factor out common Toolbar pattern (with state observers).
- [ ] Reconcile layouts with `@dxos/plugin-debug`.
