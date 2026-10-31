//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { isHandDrag, useCommandHeld } from '@dxos/react-ui-canvas';
import {
  DEFAULT_CAMERA,
  type GeometrySource,
  type GizmoMode,
  type RenderItem,
  SceneLabels,
  SNAP,
  type Theme3D,
  type WorldTransform,
  groundPoint,
  onScene,
  project,
  renderList,
  toTheme3D,
  useManifoldGeometry,
  useOrbit,
  useSceneRenderer,
} from '@dxos/react-ui-canvas/3d';
import type * as Util from '@dxos/react-ui/Util';
import { type LayoutIntent, type Scene, findLayout, findScene, placesCycle, resolveLayout3D } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type GroundBase, createdElement, dragBase, dragHeight, sizesInOneStep } from './create.ts';
import { frameTransform, scaleToLocal, toLocal } from './frame.ts';
import { axisOf, extrudeIntent, gizmoIntent } from './gizmo.ts';
import { targetOf } from './target.ts';
import {
  type FaceSelection,
  type Tool3D,
  clickCreates,
  clickSelects,
  doubleClickTarget,
  editableTool,
  groundSnap,
  menuSelection,
  orbitButtons,
  restingCenter,
} from './tools.ts';

/**
 * What a left click does: select, transform the selection with a gizmo, link two elements, place one, or (extrude)
 * drag a face along its normal.
 */

export type Scene3DEditorProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
  /** The scene the editor looks through. */
  scene: string;
  /** The layout being edited: the scene's own, or a composite's parts when drilled in. */
  editing?: string;
  /** Ids of elements in the edited layout. */
  selection: readonly string[];
  tool: Tool3D;
  /** Locked: only select and orbit work, and nothing is changed by a click, drag or key. */
  readonly?: boolean;
  theme?: Theme3D;
  /** Draws the ground grid. */
  grid?: boolean;
  /** Draws the x, y and z axes, in red, green and blue. */
  axes?: boolean;
  /** Gizmos and placing snap to the grid; holding Alt frees one gesture. */
  snap?: boolean;
  /** Overlays drawn over the scene (floating panels); their pointer events never reach the scene. */
  children?: ReactNode;
  /** Called with the view's size as it is laid out and resized, e.g. to fit the camera to it. */
  onResize?: (size: { width: number; height: number }) => void;
  /** Where to look; the scene's camera when unset. */
  camera?: Scene.Camera3D;
  geometry?: GeometrySource;
  onSelect: (ids: string[]) => void;
  onIntent: (layout: string, intent: LayoutIntent) => void;
  /** Drills into a composite's parts layout, or back out to the scene's layout. */
  onEdit: (layout: string) => void;
  /** The orbit camera, each time it moves. */
  onCameraChange?: (camera: Scene.Camera3D) => void;
  /** The selected face, set by a double-click on a plain element; Extrude acts on it. */
  face?: FaceSelection;
  onFaceChange?: (face: FaceSelection | undefined) => void;
  /** A right-click, where it was and on what; an unselected element is selected first. */
  onContextMenu?: (at: { x: number; y: number }, kind: 'element' | 'canvas') => void;
}>;

/** A swept base's height before the pointer raises it, when snapping is off. */
const FLAT = 0.1;

/** How far a press may travel and still be a click rather than a drag. */
const CLICK_SLOP = 4;

/** Everything outside the edited composite fades to this, so the parts read as the thing being edited. */
const DIMMED = 0.2;

/** The first id of the form `base-n` the layout does not use. */
const freeId = (layout: Scene.LayoutRecord | undefined, base: string): string => {
  let index = 1;
  while (layout?.elements[`${base}-${index}`]) {
    index++;
  }
  return `${base}-${index}`;
};

const isGizmoMode = (tool: Tool3D): tool is GizmoMode => tool === 'move' || tool === 'rotate' || tool === 'scale';

/**
 * Arranges a 3D layout: click selects (shift toggles, empty space clears), a gizmo moves, rotates or scales the one
 * selected element, the link tool binds two clicked elements, and a create or place tool puts an element where the
 * pointer meets the ground. A double-click on a composite edits its parts, with the rest of the scene faded; Escape
 * goes back out. The middle button orbits (Shift pans) while a tool owns the left; the right button opens the menu.
 */
export const Scene3DEditor = ({
  classNames,
  document: doc,
  scene: sceneId,
  editing: editingProp,
  selection,
  tool: toolProp,
  readonly = false,
  theme,
  grid = false,
  axes = false,
  snap = false,
  children,
  onResize,
  camera,
  geometry: givenGeometry,
  onSelect,
  onIntent: onIntentProp,
  onEdit,
  onCameraChange,
  onContextMenu,
  face,
  onFaceChange,
}: Scene3DEditorProps) => {
  const tool = editableTool(toolProp, readonly);
  // Locked, every edit stops here, whichever gesture or key would have made it.
  const onIntent = useCallback(
    (layout: string, intent: LayoutIntent) => !readonly && onIntentProp(layout, intent),
    [readonly, onIntentProp],
  );
  const scene = findScene(doc, sceneId);
  const editing = editingProp ?? scene?.layout ?? '';
  const layout = findLayout(doc, editing);
  const geometry = useManifoldGeometry(doc, givenGeometry);
  const look: Theme3D = theme ?? toTheme3D(scene?.theme) ?? 'cad';
  const given = camera ?? (scene?.dim === '3d' ? scene.camera : DEFAULT_CAMERA);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderer, size, mode } = useSceneRenderer(containerRef, canvasRef, look);
  useEffect(() => onResize?.(size), [size, onResize]);
  const view = useOrbit(containerRef, given, size, {
    enabled: true,
    buttons: orbitButtons(tool),
    onChange: onCameraChange,
  });

  // The edited layout's drawn items, by the frame that shows them (`''` at the top level) and then by element id. A
  // composite placed several times is edited through the frame last clicked, or else the first.
  // A shape being sized by a drag, drawn as it will land but not yet in the layout.
  const [draft, setDraft] = useState<Scene.Element3D>();
  const drawnDoc = useMemo(
    () =>
      draft === undefined
        ? doc
        : {
            ...doc,
            layouts: doc.layouts.map((record) =>
              record.id === (editingProp ?? scene?.layout) && record.dim === '3d'
                ? { ...record, elements: { ...record.elements, [draft.id]: draft } }
                : record,
            ),
          },
    [doc, draft, editingProp, scene],
  );
  const list = useMemo(() => renderList(drawnDoc, scene), [drawnDoc, scene]);
  const frames = useMemo(() => {
    const byFrame = new Map<string, Map<string, RenderItem>>();
    for (const item of list.items) {
      const target = targetOf(doc, sceneId, item.key);
      if (target?.layout !== editing) {
        continue;
      }
      const frame = item.key.split('/').slice(0, -1).join('/');
      const items = byFrame.get(frame) ?? new Map<string, RenderItem>();
      items.has(target.element) || items.set(target.element, item);
      byFrame.set(frame, items);
    }
    return byFrame;
  }, [doc, sceneId, list, editing]);
  const [frameHint, setFrameHint] = useState<string>();
  const commandHeld = useCommandHeld();
  const drilled = editing !== scene?.layout;
  const prefix = frameHint !== undefined && frames.has(frameHint) ? frameHint : (frames.keys().next().value ?? '');
  const keys = useMemo(() => frames.get(prefix) ?? new Map<string, RenderItem>(), [frames, prefix]);
  // Parts no element places are not drawn, so there is nothing to edit them through.
  const unplaced = drilled && frames.size === 0;
  const resolved = useMemo(() => (layout?.dim === '3d' ? resolveLayout3D(doc, layout) : {}), [doc, layout]);
  const transform = useMemo(
    () => frameTransform([...keys].flatMap(([id, item]) => (resolved[id] ? [[item, resolved[id]] as const] : []))),
    [keys, resolved],
  );

  const shown = useMemo(() => {
    if (!drilled || unplaced) {
      return list;
    }
    const inside = (key: string) => key.startsWith(`${prefix}/`);
    return {
      ...list,
      items: list.items.map((item) =>
        inside(item.key) ? item : { ...item, style: { ...item.style, opacity: (item.style?.opacity ?? 1) * DIMMED } },
      ),
    };
  }, [list, drilled, unplaced, prefix]);

  useLayoutEffect(() => {
    if (renderer && size.width > 0) {
      renderer.render(shown, view, { geometry });
    }
  }, [renderer, shown, view, geometry, size]);
  useLayoutEffect(() => renderer?.setGrid(grid), [renderer, grid]);
  useLayoutEffect(() => renderer?.setAxes(axes), [renderer, axes]);
  // Holding Alt frees the gesture under way from the grid.
  const [alt, setAlt] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => setAlt(event.altKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);
  useLayoutEffect(() => renderer?.setSnap(snap && !alt), [renderer, snap, alt]);

  useLayoutEffect(() => {
    renderer?.select(selection.flatMap((id) => keys.get(id)?.key ?? []));
  }, [renderer, selection, keys, shown]);

  useLayoutEffect(() => {
    const key = face === undefined ? undefined : keys.get(face.element)?.key;
    renderer?.selectFace(key, face?.normal);
  }, [renderer, face, keys, shown]);

  // The gizmo sits on the one selected element; a drag's end becomes an intent in the edited layout's coordinates.
  const single = selection.length === 1 ? selection[0] : undefined;
  const singleKey = single === undefined ? undefined : keys.get(single)?.key;
  useLayoutEffect(() => {
    if (!renderer) {
      return;
    }
    const before = single === undefined ? undefined : resolved[single];
    const item = single === undefined ? undefined : keys.get(single);
    renderer.attachGizmo(
      before && item && isGizmoMode(tool) ? singleKey : undefined,
      isGizmoMode(tool) ? tool : undefined,
      (after: WorldTransform) => {
        if (!before || !item || single === undefined || !isGizmoMode(tool)) {
          return;
        }
        const local = {
          center: toLocal(transform, after.center),
          rotation: after.rotation,
          scale: scaleToLocal(transform, after.scale),
        };
        const intent = gizmoIntent(tool, single, before, local);
        intent && onIntent(editing, intent);
      },
    );
  }, [renderer, tool, single, singleKey, resolved, keys, transform, editing, onIntent, shown]);

  const [linkFrom, setLinkFrom] = useState<string>();
  useEffect(() => setLinkFrom(undefined), [tool, editing]);

  const elementAt = useCallback(
    (point: { x: number; y: number }) => {
      const hit = renderer?.pick(point, { through: drilled });
      const target = hit?.item === undefined ? undefined : targetOf(doc, sceneId, hit.item);
      const element = target?.layout === editing ? target.element : undefined;
      // The frame a clicked element is drawn in is the one its gizmo and dimming follow.
      const frame = element === undefined || !hit?.item ? undefined : hit.item.split('/').slice(0, -1).join('/');
      return { hit, element, frame };
    },
    [renderer, drilled, doc, sceneId, editing],
  );

  const onClick = useCallback(
    (point: { x: number; y: number }, shift: boolean, free = false) => {
      const { hit, element, frame } = elementAt(point);
      frame !== undefined && setFrameHint(frame);
      if (face && element !== face.element) {
        onFaceChange?.(undefined);
      }
      if (clickCreates(tool, element) && typeof tool === 'object') {
        // A layout that is not drawn has nowhere to put an element; an object may not be placed inside its own parts.
        if (!hit?.point || unplaced || ('place' in tool && placesCycle(doc, editing, tool.place))) {
          return;
        }
        const center = toLocal(transform, groundSnap(hit.point, snap && !free ? SNAP.move : 0));
        const intent: LayoutIntent =
          'create' in tool
            ? {
                kind: 'create',
                element: { id: freeId(layout, tool.create), type: tool.create, center: restingCenter(center) },
              }
            : { kind: 'create', element: { id: freeId(layout, tool.place), object: tool.place, center } };
        onIntent(editing, intent);
        onSelect([intent.element.id]);
        return;
      }
      if (tool === 'link') {
        if (element === undefined) {
          setLinkFrom(undefined);
        } else if (linkFrom === undefined || linkFrom === element) {
          setLinkFrom(element);
          onSelect([element]);
        } else {
          const id = freeId(layout, 'link');
          onIntent(editing, {
            kind: 'bind',
            link: { id, type: 'link', source: { node: linkFrom }, target: { node: element } },
          });
          setLinkFrom(undefined);
          onSelect([id]);
        }
        return;
      }
      if (element === undefined) {
        onSelect([]);
      } else if (shift) {
        onSelect(selection.includes(element) ? selection.filter((id) => id !== element) : [...selection, element]);
      } else {
        onSelect([element]);
      }
    },
    [
      elementAt,
      tool,
      unplaced,
      doc,
      transform,
      layout,
      editing,
      linkFrom,
      selection,
      onIntent,
      onSelect,
      snap,
      face,
      onFaceChange,
    ],
  );

  const onDoubleClick = useCallback(
    (point: { x: number; y: number }) => {
      const { hit, element } = elementAt(point);
      const target = doubleClickTarget(
        element,
        element === undefined ? undefined : resolved[element]?.parts,
        hit?.normal,
      );
      if (target && 'drill' in target) {
        onSelect([]);
        onFaceChange?.(undefined);
        hit?.item && setFrameHint(hit.item);
        onEdit(target.drill);
      } else if (target) {
        onSelect([target.face.element]);
        onFaceChange?.(target.face);
      }
    },
    [elementAt, resolved, onEdit, onSelect, onFaceChange],
  );

  // A face drag with the extrude tool: where it started, and the face it started on.
  const extruding = useRef<{
    screen: { x: number; y: number };
    element: string;
    normal: Scene.Vec3;
    point: Scene.Vec3;
  }>(undefined);
  const onExtrudeEnd = useCallback(
    (end: { x: number; y: number }) => {
      const start = extruding.current;
      extruding.current = undefined;
      if (!start) {
        return false;
      }
      const face = axisOf(start.normal);
      const from = project(view, size, start.point);
      const to = project(view, size, {
        x: start.point.x + face.x,
        y: start.point.y + face.y,
        z: start.point.z + face.z,
      });
      const length = from && to ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
      if (!from || !to || length < 1e-3) {
        return false;
      }
      // The drag's length along the face's normal as the screen shows it.
      const dragPixels =
        ((end.x - start.screen.x) * (to.x - from.x) + (end.y - start.screen.y) * (to.y - from.y)) / length;
      const id = freeId(layout, 'extrude');
      const intent = extrudeIntent({
        id,
        target: start.element,
        normal: face,
        dragPixels,
        camera: view,
        viewport: size,
        point: start.point,
      });
      if (intent?.kind === 'extrude') {
        // The distance was measured in the world; the layout may be a composite's parts drawn at another scale.
        onIntent(editing, { ...intent, distance: Math.round((intent.distance / transform.scale) * 1000) / 1000 });
        onFaceChange?.(undefined);
        onSelect([id]);
        return true;
      }
      return false;
    },
    [view, size, layout, editing, transform, onIntent, onSelect, onFaceChange],
  );

  const press = useRef<{ x: number; y: number }>(undefined);
  // Drag to create: the base is swept on the ground, then (but for a sphere) the pointer sets the height until a
  // click fixes it; a plain click places the default size instead.
  const sizing = useRef<
    | { phase: 'base'; kind: string; id: string; from: Scene.Vec3; base?: GroundBase }
    | { phase: 'height'; kind: string; id: string; base: GroundBase; startY: number }
  >(undefined);
  const committed = useRef(false);
  const step = snap && !alt ? SNAP.move : 0;
  const cancelSizing = () => {
    sizing.current = undefined;
    setDraft(undefined);
  };
  const commitDraft = (element: Scene.Element3D) => {
    cancelSizing();
    onIntent(editing, { kind: 'create', element });
    onSelect([element.id]);
  };
  const local = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={mx(
        'relative dx-fill overflow-hidden bg-(--surface-bg) touch-none outline-none',
        (tool === 'orbit' || commandHeld) && 'cursor-grab',
        classNames,
      )}
      data-testid='scene.3d.editor'
      data-selection={selection.join(' ')}
      data-editing={editing}
      onPointerDown={(event) => {
        if (!onScene(event.nativeEvent)) {
          return;
        }
        // The canvas takes no focus of its own, so a press focuses the editor and Delete and the shortcuts reach it, as in 2D.
        event.currentTarget.focus({ preventScroll: true });
        renderer?.takeDrag();
        press.current = event.button === 0 ? { x: event.clientX, y: event.clientY } : undefined;
        // The click that fixes a dragged shape's height commits it, and is no other click.
        if (sizing.current?.phase === 'height' && event.button === 0) {
          draft && commitDraft(draft);
          committed.current = true;
          return;
        }
        if (typeof tool === 'object' && 'create' in tool && event.button === 0 && !isHandDrag(event) && !unplaced) {
          const screen = local(event);
          const ground = clickCreates(tool, elementAt(screen).element) ? groundPoint(view, size, screen) : undefined;
          if (ground) {
            sizing.current = {
              phase: 'base',
              kind: tool.create,
              id: freeId(layout, tool.create),
              from: toLocal(transform, ground),
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }
        // With the command key held a left drag moves the camera, whatever the tool, so it starts no tool gesture.
        if (tool === 'extrude' && event.button === 0 && !isHandDrag(event)) {
          const screen = local(event);
          const { hit, element } = elementAt(screen);
          // A selected face is the one extruded, wherever the drag starts; otherwise the face pressed on.
          const selectedFace = face && renderer?.face;
          extruding.current = selectedFace
            ? {
                screen,
                element: face.element,
                normal: face.normal,
                point: { x: selectedFace.center.x, y: selectedFace.center.y, z: selectedFace.center.z },
              }
            : element !== undefined && hit?.normal && hit.point
              ? { screen, element, normal: hit.normal, point: hit.point }
              : undefined;
          extruding.current && event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={(event) => {
        const current = sizing.current;
        if (!current) {
          return;
        }
        if (current.phase === 'base' && event.buttons & 1) {
          const ground = groundPoint(view, size, local(event));
          const base = ground && dragBase(current.from, toLocal(transform, ground), step);
          sizing.current = { ...current, base: base ?? undefined };
          setDraft(
            base
              ? createdElement(current.id, current.kind, base, sizesInOneStep(current.kind) ? undefined : step || FLAT)
              : undefined,
          );
        } else if (current.phase === 'height') {
          // The height is measured in the world, and the edited layout may be a composite's parts at another scale.
          const height = dragHeight(current.base, (current.startY - event.clientY) / transform.scale, view, size, step);
          setDraft(createdElement(current.id, current.kind, current.base, height));
        }
      }}
      onPointerUp={(event) => {
        if (committed.current) {
          committed.current = false;
          press.current = undefined;
          return;
        }
        const current = sizing.current;
        if (current?.phase === 'base') {
          if (current.base && draft) {
            press.current = undefined;
            if (sizesInOneStep(current.kind)) {
              commitDraft(draft);
            } else {
              sizing.current = {
                phase: 'height',
                kind: current.kind,
                id: current.id,
                base: current.base,
                startY: event.clientY,
              };
            }
            return;
          }
          // Too short to sweep a base: a click, which places the default size.
          cancelSizing();
        }
        if (!onScene(event.nativeEvent)) {
          return;
        }
        // A face drag that extruded is not a click; one too short to extrude selects, as a click does.
        if (extruding.current && onExtrudeEnd(local(event))) {
          press.current = undefined;
          return;
        }
        const start = press.current;
        press.current = undefined;
        const moved = start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP;
        // A gizmo drag, however short, is not a click.
        const dragged = renderer?.takeDrag() || renderer?.dragging;
        if (start && !moved && !dragged && clickSelects(tool)) {
          onClick(local(event), event.shiftKey, event.altKey);
        }
      }}
      onDoubleClick={(event) => onScene(event.nativeEvent) && onDoubleClick(local(event))}
      onContextMenu={(event) => {
        if (!onScene(event.nativeEvent) || !onContextMenu) {
          return;
        }
        event.preventDefault();
        const at = local(event);
        const { element } = elementAt(at);
        const next = menuSelection(selection, element);
        if (next.length !== selection.length || next.some((id, index) => id !== selection[index])) {
          onSelect(next);
        }
        onContextMenu(at, element === undefined ? 'canvas' : 'element');
      }}
      onKeyDown={(event) => {
        // A key typed in a panel (a form field) is the panel's; one on the scene's own canvas (which Babylon focuses) is ours.
        if (event.target !== event.currentTarget && event.target !== canvasRef.current) {
          return;
        }
        if (event.key === 'Escape' && sizing.current) {
          cancelSizing();
        } else if (event.key === 'Escape' && face) {
          onFaceChange?.(undefined);
        } else if (event.key === 'Escape' && drilled && scene) {
          onSelect([]);
          onEdit(scene.layout);
        } else if ((event.key === 'Delete' || event.key === 'Backspace') && selection.length > 0) {
          onIntent(editing, { kind: 'delete', ids: selection });
          onSelect([]);
        }
      }}
    >
      <canvas ref={canvasRef} className='dx-cover dx-fill block outline-none' />
      {size.width > 0 && <SceneLabels items={shown.items} camera={view} viewport={size} theme={look} mode={mode} />}
      {children}
    </div>
  );
};
