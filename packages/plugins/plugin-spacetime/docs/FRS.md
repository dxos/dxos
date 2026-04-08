# Spacetime Plugin — Functional Requirements Specification

## Overview

Spacetime is a generative 3D modeling plugin for DXOS Composer.
It provides an interactive 3D editor for creating, manipulating, and combining solid geometry within a collaborative ECHO-backed scene.
Users can create primitives, import external models, perform boolean operations, and export results — all within the Composer application shell.

The plugin uses Babylon.js for rendering and interaction, Manifold (WASM) for solid geometry operations, and ECHO for persistent, replicated scene state.

## Definitions

| Term                  | Description                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scene**             | Top-level ECHO object (`Scene.Scene`) that contains an ordered collection of Object references. Each Spacetime article in Composer is backed by one Scene.                             |
| **Object**            | A 3D entity within a Scene (`Model.Object`). Defined by either a parametric primitive or serialized mesh data, plus position, scale, rotation, and color.                              |
| **Primitive**         | A parametric solid shape: cube, sphere, cylinder, cone, or pyramid. Stored as a type name on the Object; geometry is generated at runtime.                                             |
| **Mesh**              | Serialized geometry (base64-encoded vertex positions and triangle indices) stored on an Object. Takes precedence over primitive when both are present.                                 |
| **Solid**             | A runtime Manifold representation of an Object's geometry. Used for CSG operations. Not persisted; reconstructed from Object data on load.                                             |
| **Tool**              | An interaction mode that handles pointer events on the canvas. Only one tool is active at a time. Tools manipulate Babylon meshes during interaction and commit to ECHO on completion. |
| **Selection**         | The currently selected Object(s) or face. A discriminated union: ObjectSelection, FaceSelection, or multi-object selection.                                                            |
| **Selection Mode**    | Determines selection granularity: object mode (select whole objects) or face mode (select planar faces).                                                                               |
| **Face / Facet**      | A coplanar group of triangles on a mesh surface, identified by a face ID and outward normal vector.                                                                                    |
| **Extrusion**         | Pulling or pushing a selected face along its normal to deform the solid geometry. Uses Manifold's `warp()` operation.                                                                  |
| **Boolean Operation** | A CSG (Constructive Solid Geometry) operation combining two or more solids: union (join) or difference (subtract).                                                                     |
| **Grid**              | A visual ground-plane reference at Y=0 with unit spacing. Non-pickable.                                                                                                                |
| **Preset**            | A pre-made 3D model (e.g., firetruck, race car, taxi) bundled as an OBJ asset and importable as a new Object.                                                                          |
| **Template**          | The currently selected shape or preset that determines what is created by the "add object" action.                                                                                     |
| **Snap**              | Quantizing position or extrusion distance to grid increments during drag when Shift is held.                                                                                           |

## Functional Requirements

### FR-1: Scene Management

| ID       | Requirement                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `FR-1.1` | Creating a Spacetime article in Composer SHALL create a new `Scene.Scene` ECHO object with a default cube Object. |
| `FR-1.2` | The Scene SHALL persist an ordered collection of Object references via ECHO.                                      |
| `FR-1.3` | The Scene SHALL be rendered as an interactive 3D viewport when opened in Composer.                                |
| `FR-1.4` | Scene state changes (add, remove, modify objects) SHALL replicate to other peers via ECHO.                        |

### FR-2: Object Management

| ID       | Requirement                                                                                  |
| -------- | -------------------------------------------------------------------------------------------- |
| `FR-2.1` | The user SHALL be able to add a new Object to the Scene via a toolbar action.                |
| `FR-2.2` | New Objects SHALL be created from the currently selected template (primitive or preset).     |
| `FR-2.3` | Supported primitives: cube, sphere, cylinder, cone, pyramid.                                 |
| `FR-2.4` | Supported presets: firetruck, race car, taxi (bundled OBJ assets).                           |
| `FR-2.5` | The user SHALL be able to delete the selected Object(s) via a toolbar action.                |
| `FR-2.6` | Each Object SHALL have a color (hue) that can be changed via the toolbar color picker.       |
| `FR-2.7` | Object properties (position, scale, rotation, color, geometry) SHALL persist in ECHO.        |
| `FR-2.8` | Objects defined by a primitive SHALL generate geometry at runtime from their type and scale. |
| `FR-2.9` | Objects with serialized mesh data SHALL use that data instead of primitive generation.       |

### FR-3: Selection

| ID       | Requirement                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| `FR-3.1` | The user SHALL be able to toggle between object selection mode and face selection mode via the toolbar.             |
| `FR-3.2` | In object mode, clicking an Object SHALL select it, shown by a highlight glow.                                      |
| `FR-3.3` | In face mode, clicking a face SHALL select all coplanar triangles, shown by a colored overlay.                      |
| `FR-3.4` | Clicking empty space SHALL clear the selection.                                                                     |
| `FR-3.5` | Selection SHALL persist across tool switches.                                                                       |
| `FR-3.6` | In object mode, shift-clicking an Object SHALL add it to or remove it from a multi-object selection (ordered list). |
| `FR-3.7` | Multi-object selection SHALL maintain insertion order (first-clicked is primary).                                   |
| `FR-3.8` | Multi-select SHALL only be available in object selection mode.                                                      |

### FR-4: Tools

#### FR-4.1: Select Tool

| ID         | Requirement                                                                             |
| ---------- | --------------------------------------------------------------------------------------- |
| `FR-4.1.1` | The select tool SHALL pick objects or faces based on the current selection mode.        |
| `FR-4.1.2` | Object selection SHALL show a highlight-layer glow on the mesh.                         |
| `FR-4.1.3` | Face selection SHALL show a coplanar triangle overlay offset slightly from the surface. |

#### FR-4.2: Move Tool

| ID         | Requirement                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FR-4.2.1` | Dragging a selected object SHALL translate it along the ground plane (X/Z axes).                                                                               |
| `FR-4.2.2` | Holding the platform modifier key (Cmd on macOS, Alt on Windows/Linux) during drag SHALL switch movement to the vertical axis (Y) instead of the ground plane. |
| `FR-4.2.3` | Holding Shift during drag SHALL snap the object position to grid increments.                                                                                   |
| `FR-4.2.4` | Position SHALL be committed to ECHO only on pointer-up (drag completion).                                                                                      |
| `FR-4.2.5` | Camera orbit SHALL be disabled during drag.                                                                                                                    |
| `FR-4.2.6` | When multiple objects are selected, dragging SHALL move all selected objects by the same delta.                                                                |

#### FR-4.3: Extrude Tool

| ID         | Requirement                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| `FR-4.3.1` | The extrude tool SHALL require a face selection to operate.                     |
| `FR-4.3.2` | Dragging SHALL extrude (push/pull) the selected face along its normal.          |
| `FR-4.3.3` | Holding Shift during extrusion SHALL snap the distance to grid increments.      |
| `FR-4.3.4` | Negative extrusion SHALL be clamped to prevent collapsing below a minimum size. |
| `FR-4.3.5` | The Babylon mesh SHALL update in real-time during drag (visual feedback).       |
| `FR-4.3.6` | The Manifold solid and ECHO Object SHALL be updated on drag completion.         |

### FR-5: Camera and View

| ID       | Requirement                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| `FR-5.1` | The camera SHALL orbit around the scene center via mouse drag (ArcRotateCamera). |
| `FR-5.2` | The camera SHALL support scroll-wheel zoom and pinch zoom.                       |
| `FR-5.3` | The user SHALL be able to toggle grid visibility via the toolbar.                |
| `FR-5.4` | The user SHALL be able to toggle a debug panel via the toolbar.                  |
| `FR-5.5` | The scene background SHALL respect the DXOS theme (light/dark mode).             |

### FR-6: Import and Export

| ID       | Requirement                                                                                 |
| -------- | ------------------------------------------------------------------------------------------- |
| `FR-6.1` | The user SHALL be able to import GLB/GLTF files as new Objects.                             |
| `FR-6.2` | The user SHALL be able to import OBJ files as new Objects.                                  |
| `FR-6.3` | Imported meshes SHALL be converted to Manifold solids where possible (watertight geometry). |
| `FR-6.4` | The user SHALL be able to export the selected Object as a binary STL file.                  |

### FR-7: Boolean Operations

| ID       | Requirement                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| `FR-7.1` | The user SHALL be able to join (union) two or more selected Objects into a single new Object.                       |
| `FR-7.2` | The user SHALL be able to subtract selected Objects from the first-selected Object (ordered difference: A - B - C). |
| `FR-7.3` | Boolean operations SHALL delete the source Objects and create one new Object.                                       |
| `FR-7.4` | The resulting Object's position SHALL be that of the first-selected Object (the result does not visually move).     |
| `FR-7.5` | The resulting Object SHALL store serialized mesh data (not a primitive).                                            |
| `FR-7.6` | Join and subtract SHALL be available as toolbar menu actions.                                                       |
| `FR-7.7` | Join and subtract SHALL require at least two selected Objects; actions SHALL be disabled otherwise.                 |

### FR-8: Keyboard Shortcuts

| ID       | Requirement                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------- |
| `FR-8.1` | Keyboard shortcuts SHALL be scoped to the canvas element (active only when the editor has focus). |
| `FR-8.2` | `m` SHALL activate the move tool.                                                                 |
| `FR-8.3` | `e` SHALL activate the extrude tool.                                                              |
| `FR-8.4` | `x` or `Backspace` SHALL delete the selected Object(s).                                           |
| `FR-8.5` | Shortcuts SHALL NOT fire when focus is in a text input or other non-canvas element.               |

### FR-9: Plugin Integration

| ID       | Requirement                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `FR-9.1` | The plugin SHALL register with Composer via standard plugin metadata, translations, and surface capabilities. |
| `FR-9.2` | The plugin SHALL define ECHO types: `Scene.Scene`, `Model.Object`, `Settings.Settings`.                       |
| `FR-9.3` | The plugin SHALL provide a settings panel consistent with other Composer plugins.                             |
| `FR-9.4` | The plugin SHALL load Manifold WASM lazily on first use.                                                      |
