---
id: dxos.plugin.spacetime
name: SpacetimePlugin
version: 0.1.0
extends: [dxos.plugin.base]
tags: [plugin, 3d, collaborative, csg]
status: draft
---

Generative 3D modeling plugin for DXOS Composer.
Uses Babylon.js for rendering, Manifold (WASM) for solid geometry (CSG),
and ECHO for collaborative persistence.

## Definitions

```def Scene
Top-level ECHO object backing each Spacetime article in Composer.

type: ECHO<Scene.Scene>
contains: Object[]
invariants:
  - has at least one Object at creation
  - Objects maintain insertion order
```

```def Object
A 3D entity within a Scene, defined by geometry, transform, and color.

type: ECHO<Model.Object>
fields:
  primitive?: PrimitiveType   # cube | sphere | cylinder | cone | pyramid
  mesh?: MeshData             # base64-encoded vertex positions + triangle indices
  position: Vec3
  scale: Vec3
  rotation: Vec3
  color: Hue
invariants:
  - mesh takes precedence over primitive when both present
  - geometry is generated at runtime from primitive type and scale
```

```def Tool
An interaction mode that handles pointer events on the canvas.

variants: select | move | extrude
invariants:
  - exactly one Tool is active at a time
  - Babylon mesh updates in real-time during drag
  - ECHO state commits only on pointer-up
```

```def Selection
The currently selected entity. Discriminated union.

variants:
  ObjectSelection: { objects: Object[], primary: Object }
  FaceSelection:   { object: Object, faceId: number, normal: Vec3 }
invariants:
  - multi-select only available in object mode
  - insertion order preserved (first-clicked is primary)
```

```def PrimitiveType
  variants: cube | sphere | cylinder | cone | pyramid
```

```def BooleanOp
  variants: union | difference
  note: difference applies as ordered subtraction — A - B - C
```

## Features

```feat FR-1: Scene Management
desc: Creation and collaborative replication of 3D scenes.

  req FR-1.1: create
    when: user creates a Spacetime article in Composer
    then: new Scene ECHO object created with one default cube Object

  req FR-1.2: persist
    Scene persists an ordered collection of Object references via ECHO.

  req FR-1.3: render
    when: Scene article is opened in Composer
    then: Scene renders as an interactive 3D viewport

  req FR-1.4: replicate
    when: any Scene state change (add / remove / modify Objects)
    then: change replicates to all peers via ECHO
    tags: [collaborative]
```

```feat FR-2: Object Management
desc: Adding, removing, and modifying 3D objects within a scene.

  req FR-2.1: add
    when: user triggers add action on toolbar
    then: new Object created from currently selected template

  req FR-2.2: template
    Template is the currently selected primitive or preset (firetruck | race car | taxi).

  req FR-2.3: delete
    when: user triggers delete action (toolbar or keyboard)
    then: selected Object(s) removed from Scene

  req FR-2.4: color
    when: user picks a color from the toolbar color picker
    then: selected Object.color updated

  req FR-2.5: persistence
    Object properties (position, scale, rotation, color, geometry) persist in ECHO.
```

```feat FR-3: Selection
desc: Object and face selection modes.

  req FR-3.1: mode-toggle
    User can toggle between object selection mode and face selection mode via toolbar.

  req FR-3.2: object-select
    when: user clicks an Object in object mode
    then: Object selected; highlight-layer glow shown on mesh

  req FR-3.3: face-select
    when: user clicks a face in face mode
    then: all coplanar triangles selected; colored overlay shown offset from surface

  req FR-3.4: deselect
    when: user clicks empty space
    then: selection cleared

  req FR-3.5: persistence
    Selection persists across tool switches.

  req FR-3.6: multi-select
    when: Shift + click on Object in object mode
    then: Object added to or removed from multi-object selection (ordered list)
```

```feat FR-4: Tools

  ```feat FR-4.1: Select Tool

    req FR-4.1.1: pick
      Picks objects or faces according to current selection mode.
  ```

  ```feat FR-4.2: Move Tool
  desc: Translates selected Objects via pointer drag.

    req FR-4.2.1: ground-plane
      when: dragging selected Object
      then: translate along X/Z ground plane

    req FR-4.2.2: vertical
      when: platform modifier held (Cmd/macOS, Alt/Win) during drag
      then: translate along Y axis instead of ground plane

    req FR-4.2.3: snap
      when: Shift held during drag
      then: position snaps to grid increments

    req FR-4.2.4: commit
      Position commits to ECHO only on pointer-up.

    req FR-4.2.5: camera-lock
      Camera orbit disabled while drag is in progress.

    req FR-4.2.6: multi
      when: multiple Objects selected
      then: all selected Objects translate by the same delta
  ```

  ```feat FR-4.3: Extrude Tool
  desc: Push/pull a selected face along its normal using Manifold warp().

    req FR-4.3.1: requires
      requires: FaceSelection active

    req FR-4.3.2: drag
      when: user drags
      then: selected face extruded along its normal

    req FR-4.3.3: snap
      when: Shift held during drag
      then: extrusion distance snaps to grid increments

    req FR-4.3.4: clamp
      Negative extrusion clamped to prevent sub-minimum collapse.

    req FR-4.3.5: preview
      Babylon mesh updates in real-time during drag.

    req FR-4.3.6: commit
      Manifold solid and ECHO Object updated on drag completion.
  ```
```

```feat FR-5: Camera and View

  req FR-5.1: orbit
    Camera orbits scene center via mouse drag (ArcRotateCamera).

  req FR-5.2: zoom
    Camera supports scroll-wheel zoom and pinch zoom.

  req FR-5.3: grid
    User can toggle grid visibility via toolbar.

  req FR-5.4: debug
    User can toggle a debug panel via toolbar.

  req FR-5.5: theme
    Scene background respects DXOS theme (light / dark mode).
```

```feat FR-6: Import and Export

  req FR-6.1: import-glb
    User can import GLB/GLTF files as new Objects.

  req FR-6.2: import-obj
    User can import OBJ files as new Objects.

  req FR-6.3: manifold-convert
    when: imported mesh is watertight
    then: mesh converted to Manifold solid

  req FR-6.4: export-stl
    User can export the selected Object as a binary STL file.
```

```feat FR-7: Boolean Operations
desc: CSG operations combining two or more selected Objects.

  req FR-7.1: join
    when: user invokes join with ≥2 Objects selected
    then: union of all selected Objects created as new Object

  req FR-7.2: subtract
    when: user invokes subtract with ≥2 Objects selected
    then: ordered difference (primary − others) created as new Object

  req FR-7.3: consume
    Source Objects deleted; one new Object created.

  req FR-7.4: position
    Result Object positioned at primary (first-selected) Object's position.

  req FR-7.5: result-type
    Result Object stores serialized mesh data (not a primitive).

  req FR-7.6: availability
    Join and subtract disabled unless selection.count >= 2.
```

## Interfaces

```iface Toolbar
  addObject(template: Template) → Object
  deleteSelected() [requires: selection]
  setColor(hue: Hue) [requires: selection]
  setTool(tool: Tool)
  setSelectionMode(mode: object | face)
  toggleGrid()
  toggleDebug()
  menu boolean-ops:
    join() [requires: selection.count >= 2]
    subtract() [requires: selection.count >= 2]
  preset-picker: Template
```

```iface Keyboard [scope: canvas, not-when: focus in input]
  m         → setTool(move)
  e         → setTool(extrude)
  x | Del   → deleteSelected()
```

```iface Plugin [extends: ComposerPlugin]
  meta: id, name, description, icon, tags
  echo-types: [Scene.Scene, Model.Object, Settings.Settings]
  surfaces: [main article viewport, settings panel]
  lazy: Manifold WASM loaded on first use
```

## Acceptance

```test T-FR-1.1: Create scene
  given: Composer is open
  when: user creates a new Spacetime article
  then:
    - Scene ECHO object exists
    - Scene.objects.length === 1
    - Scene.objects[0].primitive === "cube"
```

```test T-FR-3.6: Multi-select ordering
  given: object selection mode active, no selection
  when: user clicks A, then Shift+clicks B, then Shift+clicks C
  then:
    - selection.objects === [A, B, C]
    - selection.primary === A
```

```test T-FR-4.2.3: Snap during move
  given: Object is selected, move tool active
  when: user drags while holding Shift
  then: Object.position is quantized to grid increments after drag
  then: ECHO commit fires on pointer-up only
```

```test T-FR-7.2: Boolean subtract
  given: Objects [A, B] selected in order, A is primary
  when: user invokes subtract
  then:
    - new Object created with geometry = A - B
    - new Object.position === A.position
    - A and B removed from Scene
    - new Object stores mesh data (not primitive)
```

```test T-FR-8: Keyboard scope
  given: focus is in a text input (not canvas)
  when: user presses "m" or "e" or "x"
  then: no tool action fires
```
