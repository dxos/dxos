# @dxos/plugin-canvas

## Summary

The system is built on `@dxos/graph` as the core abstraction layer Canvas visualization consists of:

- A graph of reactive `Shape` objects (esp. `Polygon`, `Path`) and corresponding components
- Polygons have a generic outline `Frame`, which may include `Anchor` points, which are used to connect `Path` objects
- Default positional layout with pluggable auto-layout options
- No direct knowledge of computation logic

### Compute functionality:

- Implemented via a custom `ShapeRegistry` containing logic gates
- Shapes maintain dual representation in both canvas and state machine graphs
- Future iteration will separate these into parallel graphs

### State machine behavior:

- Nodes follow `ComputeNode<INPUT, OUTPUT>` typing pattern
- Basic nodes like switches use `Switch<S.Void, S.Boolean>` schema
- Execution starts from nodes requiring no input
- Output propagates through graph based on node linkage
- Node firing occurs when all input properties are satisfied

### Reactive integration:

- ComputeNode state changes are Effect signals
- Canvas React components automatically update based on these signals


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
- [ ] browser log doesn't show function name or source.
- [ ] Warning: Unknown event handler property `onCheckedChange`. (Switch)
