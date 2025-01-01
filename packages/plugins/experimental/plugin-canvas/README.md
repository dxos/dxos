# @dxos/plugin-canvas

## Ontology

- The `Graph` represents the data structure, consisting of extensible `GraphNode` and `GraphEdge` elements. 
- Like a `View`, it may be a projection of underlying ECHO objects.
- The `Editor` manages a `GraphModel<GraphNode<Shape>>`, which implements a graph of `Shape` nodes.
- `Shape` nodes can be generic extensions (e.g., `RectangleShape`, `EllipseShape`, `PathShape`), 
  or more customized components (e.g., `FunctionShape`).
- Each `Shape` may have a reference to an external data object, from which it may derive properties.

## Design

- All visual elements are represented by a `Shape` object.
- Most shapes implement the `Polygon` type, which is rendered by the `Frame` component.
  - Specific shapes are able to customize the `Polygon` by overriding the `Component` option.
- The underlying canvas is managed by the `@dxos/react-ui-canvas` components, which handle panning and zoom.
- Most of the UX logic is handled by the hooks; in particular:
  - `useLayout` handles the rendering of `Shape` objects on to their corresponding rect components.
  - `useDragMonitor` handles the drag/drop logic, which include anchor based connections.

## Development

### Phase 1: Basic editor
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

### Phase 2: 
- [x] FunctionShape components with properties and anchor points. Add/delete and Play buttons.
- [x] Shape registry.
  - [x] Custom frames.
  - [x] Custom anchors.
  - [x] Bezier connectors.
  - [x] Pluggable drag/drop logic: determines which drag/drop targets are active; replaces current dragging/linking state.
  - [x] Select/edit Rectangle/ellipse/function name.
  - [ ] Delete link when deleting anchor.
  - [ ] Prevent input anchors being used multiple times (custom rule).
  - [ ] Loop back path if anchors are not facing each other.
  - [ ] Green anchors if match.
  - [ ] Cache layout.
  - [ ] Touch input (ipad).

### Phase 3: State machine

- [x] Generalize function anchors (e.g., shape with anchors).
- [x] Shape => ComputeNode? (e.g., get properties, current state, etc.)
- [x] State machine (local implementation); run mode.
  - [x] Function shape driven by schema; add property.
  - [x] All compute nodes should be driven by schema.
  - [ ] Connect state machine.
- [x] Logic gates (AND, etc.)
- [x] Timer.
- [ ] Select function via properties (show schema).
- [ ] ECHO Query.
- [ ] GPT (with prompt and base prompt inputs).

### Phase 4:
- [ ] Group/collapse nodes; hierarchical graph editor. 

### Technical Debt
- [ ] `AttentionContainer` (and key management).
- [ ] Factor out common Toolbar pattern (with state observers).
- [ ] Reconcile Graph with framework (ECHO, app-graph, etc.)
- [ ] Reconcile @antv layouts with `@dxos/plugin-debug`.

### Errors
- [ ] log.catch not displayed in state machine error handler.
- [ ] Warning: Unknown event handler property `onCheckedChange`. (Switch)
- [ ] inspect node:util build error.
