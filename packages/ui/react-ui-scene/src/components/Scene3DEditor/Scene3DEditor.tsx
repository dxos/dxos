//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { type LayoutIntent, type Resolved3D, type Scene, findLayout, findScene, resolveLayout3D } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import {
  type GeometrySource,
  type GizmoMode,
  type RenderItem,
  SceneLabels,
  type Theme3D,
  type WorldTransform,
  isTheme3D,
  renderList,
} from '../../three/index.ts';
import { DEFAULT_CAMERA, useManifoldGeometry, useOrbit, useSceneRenderer } from '../Scene3DView/index.ts';
import { gizmoIntent } from './gizmo.ts';
import { targetOf } from './target.ts';

/** What a left click does: select, transform the selection with a gizmo, link two elements, or place one. */
export type Tool3D = 'select' | GizmoMode | 'link' | { create: string } | { place: string };

export type Scene3DEditorProps = Util.ThemedClassName<{
  document: Scene.SceneDocument;
  /** The scene the editor looks through. */
  scene: string;
  /** The layout being edited: the scene's own, or a composite's parts when drilled in. */
  editing?: string;
  /** Ids of elements in the edited layout. */
  selection: readonly string[];
  tool: Tool3D;
  theme?: Theme3D;
  /** Where to look; the scene's camera when unset. */
  camera?: Scene.Camera3D;
  geometry?: GeometrySource;
  onSelect: (ids: string[]) => void;
  onIntent: (layout: string, intent: LayoutIntent) => void;
  /** Drills into a composite's parts layout, or back out to the scene's layout. */
  onEdit: (layout: string) => void;
  /** The orbit camera, each time it moves. */
  onCameraChange?: (camera: Scene.Camera3D) => void;
}>;

/** How far a press may travel and still be a click rather than a drag. */
const CLICK_SLOP = 4;

/** Everything outside the edited composite fades to this, so the parts read as the thing being edited. */
const DIMMED = 0.2;

type Transform = { offset: Scene.Vec3; scale: number };

const IDENTITY: Transform = { offset: { x: 0, y: 0, z: 0 }, scale: 1 };

/** Maps a layout's local coordinates to the world, read back from one of its drawn items. */
const transformOf = (item: RenderItem | undefined, element: Resolved3D | undefined): Transform => {
  if (!item || !element?.center) {
    return IDENTITY;
  }
  const scale = item.scale.x / (element.scale?.x ?? 1) || 1;
  return {
    scale,
    offset: {
      x: item.center.x - element.center.x * scale,
      y: item.center.y - element.center.y * scale,
      z: item.center.z - element.center.z * scale,
    },
  };
};

const toLocal = (transform: Transform, point: Scene.Vec3): Scene.Vec3 => {
  const round = (value: number) => Math.round(value * 1000) / 1000 + 0;
  return {
    x: round((point.x - transform.offset.x) / transform.scale),
    y: round((point.y - transform.offset.y) / transform.scale),
    z: round((point.z - transform.offset.z) / transform.scale),
  };
};

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
 * goes back out. The middle button orbits and the right button pans while a tool owns the left.
 */
export const Scene3DEditor = ({
  classNames,
  document: doc,
  scene: sceneId,
  editing: editingProp,
  selection,
  tool,
  theme,
  camera,
  geometry: givenGeometry,
  onSelect,
  onIntent,
  onEdit,
  onCameraChange,
}: Scene3DEditorProps) => {
  const scene = findScene(doc, sceneId);
  const editing = editingProp ?? scene?.layout ?? '';
  const layout = findLayout(doc, editing);
  const geometry = useManifoldGeometry(doc, givenGeometry);
  const look: Theme3D = theme ?? (isTheme3D(scene?.theme) ? scene.theme : 'cad');
  const given = camera ?? (scene?.dim === '3d' ? scene.camera : DEFAULT_CAMERA);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderer, size } = useSceneRenderer(containerRef, canvasRef, look);
  const view = useOrbit(containerRef, given, size, { enabled: true, buttons: 'secondary', onChange: onCameraChange });

  // Each drawn item of the edited layout, by element id; a composite shown twice is edited through its first frame.
  const list = useMemo(() => renderList(doc, scene), [doc, scene]);
  const keys = useMemo(() => {
    const byId = new Map<string, RenderItem>();
    for (const item of list.items) {
      const target = targetOf(doc, sceneId, item.key);
      target?.layout === editing && !byId.has(target.element) && byId.set(target.element, item);
    }
    return byId;
  }, [doc, sceneId, list, editing]);
  const drilled = editing !== scene?.layout;
  const prefix = drilled ? (keys.values().next().value?.key.split('/').slice(0, -1).join('/') ?? '') : '';
  const resolved = useMemo(() => (layout?.dim === '3d' ? resolveLayout3D(doc, layout) : {}), [doc, layout]);
  const transform = useMemo(() => {
    const [id, item] = keys.entries().next().value ?? [];
    return id === undefined ? IDENTITY : transformOf(item, resolved[id]);
  }, [keys, resolved]);

  const shown = useMemo(() => {
    if (!drilled) {
      return list;
    }
    const inside = (key: string) => key.startsWith(`${prefix}/`);
    return {
      ...list,
      items: list.items.map((item) =>
        inside(item.key) ? item : { ...item, style: { ...item.style, opacity: (item.style?.opacity ?? 1) * DIMMED } },
      ),
    };
  }, [list, drilled, prefix]);

  useLayoutEffect(() => {
    if (renderer && size.width > 0) {
      renderer.render(shown, view, { geometry });
    }
  }, [renderer, shown, view, geometry, size]);

  useLayoutEffect(() => {
    renderer?.select(selection.flatMap((id) => keys.get(id)?.key ?? []));
  }, [renderer, selection, keys, shown]);

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
          scale: {
            x: after.scale.x / transform.scale,
            y: after.scale.y / transform.scale,
            z: after.scale.z / transform.scale,
          },
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
      return { hit, element: target?.layout === editing ? target.element : undefined };
    },
    [renderer, drilled, doc, sceneId, editing],
  );

  const onClick = useCallback(
    (point: { x: number; y: number }, shift: boolean) => {
      const { hit, element } = elementAt(point);
      if (typeof tool === 'object') {
        if (!hit?.point) {
          return;
        }
        const center = toLocal(transform, hit.point);
        const intent: LayoutIntent =
          'create' in tool
            ? { kind: 'create', element: { id: freeId(layout, tool.create), kind: tool.create, center } }
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
            link: { id, kind: 'link', from: { element: linkFrom }, to: { element } },
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
    [elementAt, tool, transform, layout, editing, linkFrom, selection, onIntent, onSelect],
  );

  const onDoubleClick = useCallback(
    (point: { x: number; y: number }) => {
      const { element } = elementAt(point);
      const parts = element === undefined ? undefined : resolved[element]?.parts;
      if (parts !== undefined) {
        onSelect([]);
        onEdit(parts);
      }
    },
    [elementAt, resolved, onEdit, onSelect],
  );

  const press = useRef<{ x: number; y: number }>(undefined);
  const local = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={mx('relative dx-fill overflow-hidden bg-(--surface-bg) touch-none outline-none', classNames)}
      data-testid='scene.3d.editor'
      data-selection={selection.join(' ')}
      data-editing={editing}
      onPointerDown={(event) => {
        press.current = event.button === 0 ? { x: event.clientX, y: event.clientY } : undefined;
      }}
      onPointerUp={(event) => {
        const start = press.current;
        press.current = undefined;
        const moved = start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP;
        if (start && !moved && !renderer?.dragging) {
          onClick(local(event), event.shiftKey);
        }
      }}
      onDoubleClick={(event) => onDoubleClick(local(event))}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && drilled && scene) {
          onSelect([]);
          onEdit(scene.layout);
        } else if ((event.key === 'Delete' || event.key === 'Backspace') && selection.length > 0) {
          onIntent(editing, { kind: 'delete', ids: selection });
          onSelect([]);
        }
      }}
    >
      <canvas ref={canvasRef} className='dx-cover dx-fill block outline-none' />
      {size.width > 0 && <SceneLabels items={shown.items} camera={view} viewport={size} theme={look} />}
    </div>
  );
};
