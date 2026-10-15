# Canvas as an animation host

Status: draft, 2026-10-15. Part of the plugin-animation project (`@dxos/animation`, dxos/dxos#13981, spec
`agents/superpowers/specs/2026-10-14-plugin-animation-design.md` on `claude/3d-isometric-phone-d64222`, section
"Canvas integration").

## Goal

`@dxos/react-ui-canvas` and `plugin-canvas` can show a scripted network animation without the animation plugin
writing to the drawing. That needs four things: compound objects, an Objects panel, a presentation camera, and a
seam for per-frame read-only overrides.

Out of scope: the timeline, device node types, packets, the molecule simulation, layouts.

## Decisions already made

- Rendering stays DOM/CSS in react-ui-canvas. No three.js.
- A tilted camera is presentation only. Editing stays 2D.
- A compound object is a sub-graph, as a canvas scene is today.

## 1. Compound objects

A compound object is an existing frame node (`FrameNode`) whose `scene` names a scene of the same store. No new
node type and no new record kind are added.

| Concern                     | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                        | The child scene's `name`. Falls back to the frame's `label`, then the scene id. Rename writes the scene's `name`, which `plugin-canvas` already persists in its `SceneRecord`.                                                                                                                                                                                                                                                                                                                                                        |
| Group                       | `groupIntoScene` (`utils/group.ts`) already converts a selection. It moves out of `SceneView.Properties` into a shared `useCompoundActions` hook, so the Objects panel, the Properties panel and a ⌘G key all call one function.                                                                                                                                                                                                                                                                                                      |
| Ungroup                     | New `ungroupScene(scene, frameId, child)`. It maps every child node through the portal's frame (`portalFrame`, `portalScale`), so the nodes land where they were drawn, even after the frame was moved or resized. Links inside the child come along. A link attached to the frame is re-attached to the child node closest to its other end. An id that already exists in the parent gets a new id. The child scene is removed from the store only when no other frame opens it. One undo step, as group has today (`recordScenes`). |
| Hide                        | New optional `hidden` on `nodeBase`. `visibleScene` (`utils/layers.ts`) drops hidden nodes and their links, as it does for hidden layers. `plugin-canvas` persists it with no change, because `NodeRecord.node` is `NodeBase`.                                                                                                                                                                                                                                                                                                        |
| Nesting, enter, edit, close | Already supported: drill-in, drill-out and the breadcrumbs. The panel calls `drillIn` and `drillOut`.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

A frame that shows another drawing (`plugin-canvas` linked scenes, `parseLinkedSceneId`) is listed in the tree but
cannot be ungrouped or renamed. It belongs to the other drawing.

## 2. Objects panel

`SceneView.Objects` is a new inspector beside `SceneView.Layers` (`InspectorDef` order 1.5, `float: 'empty'`, so it
docks or floats like Layers). It is a presentational `ObjectsPanel` in `components/Objects/` plus a container part
in `SceneView.tsx`, which is the same split as `LayersPanel` and `SceneView.Layers`.

- The tree comes from a pure `compoundTree(scenes, root)` in `utils/scenes.ts`. It follows frames down from the
  root, guards against cycles, and lists each node as `{ path: NodeId[], frame, scene, name, hidden, children }`.
  The animation spec says that timeline selectors use these paths.
- The tree renders with `@dxos/react-ui-list` `Tree`. Names are edited with `Editable`, as layer names are.
- Row actions: select (sets the selection in the scene that holds the frame, drilling out first if needed), frame
  in view (fit the camera to the frame's bounds), enter (`drillIn` along the path), show or hide (the eye button),
  rename (double-click).
- Toolbar, through `useMenuActions` and `Menu.Root`: "Group selection" (enabled for one or more unlocked selected
  nodes) and "Ungroup" (enabled for a selected compound object).
- Stories: `Objects.stories.tsx` (the panel alone, with fixtures) and a `SceneView` story with nested compound
  objects and the panel docked.

## 3. Presentation camera

`Camera` gets two optional fields, `tilt` and `spin`, in degrees. Isometric is `{ tilt: 55, spin: -35 }`. Top is
`{ tilt: 0, spin: 0 }`. Both are unset by default, so stored cameras do not change.

- `cameraTransform(camera, viewport)` puts the rotation in front of the existing transform, about the centre of
  the viewport:
  `translate(cx, cy) rotateX(tilt) rotateZ(spin) translate(-cx, -cy) scale(zoom) translate(x, y)`.
  The projection is orthographic (no `perspective`), so it matches the isometric look.
- `isPresentation(camera)` is true when tilt or spin is not zero. While it is true, `SceneView` treats the view as
  read-only: the capabilities become `readonlyCapabilities`, the selection is cleared, and the pointer machine
  starts no select, move, marquee or link gesture. Wheel zoom-at-point and auto-drill are off, because
  `screenToScene` cannot invert the tilt. Pan and the toolbar zoom buttons still work.
- Portals draw their children with 2D transforms, so the children stay in the ground plane without
  `preserve-3d` (as built). The camera div gets `transform-style: preserve-3d` while posed, only so that a node
  which draws itself in 3D (a device body) stands out of the plane. While posed, any press pans: a screen delta
  inverts through the pose (`screenDeltaToScene`), but a point does not.
- `animateCamera` interpolates `tilt` and `spin` linearly, together with the existing van Wijk zoom path.
- Story `Presentation.stories.tsx`: a network of nested compound objects, and a toggle that animates between top
  and isometric.

## 4. Time-override seam

Another plugin derives each frame from the stored drawing. It does not write to ECHO.

```ts
type NodeOverride = Partial<Pick<NodeBase, 'center' | 'size' | 'hidden' | 'style'>>;
type SceneOverride = {
  nodes?: Record<NodeId, NodeOverride>;
  links?: Record<LinkId, Partial<Pick<Link, 'hidden' | 'style'>>>;
  layers?: Record<LayerId, { hidden?: boolean }>;
};
type SceneOverrides = Readonly<Record<SceneId, SceneOverride>>;

/** Pure: the scene with the overrides merged over it. */
applyOverrides(scene: Scene, override: SceneOverride | undefined): Scene;

/** A read-only store whose every scene is the base scene with the overrides merged over it. */
createOverrideStore(base: SceneStore, overrides: Atom.Atom<SceneOverrides>): SceneStore;
```

- The seam is a store, not a projection, because portals read child scenes through `store.scene(id)`
  (`SceneLayer.tsx:741`). Overriding the store reaches every depth. A projection covers only the root.
- The overrides are keyed by scene id, so the animation can drive objects inside compound objects.
- Writes to the override store are dropped. A host shows it with `readonly` on `SceneView.Root`.
- Link `hidden` is added too, so a timeline can show or hide a link.
- Particles go in the existing `overlay` prop of `SceneView.Canvas`. It renders inside the camera div, so it
  tilts with the scene. That prop is documented in JSDoc and gets no further change.
- Story `Override.stories.tsx`: a time atom ticks on `requestAnimationFrame`, the overrides move one node and blink
  one layer, and the overlay draws a dot that travels along a link.
- The seam is documented in `react-ui-canvas/docs/DESIGN.md` (a new section, "Overrides").

## Plugin-canvas

- `CanvasArticle` mounts `SceneView.Objects` beside `SceneView.Layers`.
- Rename and ungroup change and delete scene records through the existing store binding (`model/store.ts`). A
  `store.test.ts` case checks that a compound object, its name, its `hidden` flag and an ungroup survive a round
  trip through the content records.

## Testing

- Unit (vitest, `react-ui-canvas`): `ungroupScene` (positions after a move and a resize of the frame, crossing
  links, id collisions, a shared scene), `compoundTree` (nesting, cycles), `visibleScene` with hidden nodes,
  `cameraTransform` and `isPresentation`, `applyOverrides`, and `createOverrideStore` (it derives values and drops
  writes).
- Unit (`plugin-canvas`): the persistence round trip.
- Stories render with no console errors, checked in the shared storybook on port 9009.

## Risks

- `preserve-3d` with `overflow: hidden` flattens a 3D context. That matters only for a node that draws itself in
  3D inside a clipping portal. Coplanar children are unaffected (as built).
- Hit-testing under tilt is out of scope, so a tilted view cannot select anything.
