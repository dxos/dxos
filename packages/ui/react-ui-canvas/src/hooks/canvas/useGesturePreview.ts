//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type Bounds, type Endpoint, type Point, isPointEndpoint } from '@dxos/scene';

import { type Drag, type Projection, reduceIntent } from '../../engine/index.ts';
import { type Intent, type View } from '../../model/index.ts';
import { createLink, duplicateSelection, hasVertices, nodeBounds, refitPolyline, topZ } from '../../utils/index.ts';
import { type PointerMachine, PREVIEW_NODE_ID, isLinkDrawn } from './usePointerMachine.ts';

/** How long a move's pointer rests before the shapes snap to where they will land. */
const SETTLE_MS = 200;

/** The link drawn as a preview during a drag; it never reaches the model. */
const PREVIEW_LINK_ID = 'preview-link';

export type UseGesturePreviewOptions = {
  scene: View;
  drag: Drag | undefined;
  projection: Projection;
  /** The finest grid level drawn: a link previews once it has gone this far. */
  minor: number;
} & Pick<PointerMachine, 'createdNode'>;

export type GesturePreview = {
  /** The scene as drawn while the gesture is in flight. */
  displayScene: View;
  /** The gesture would be refused by the projection (e.g. an overlap on the lattice). */
  blocked: boolean;
  /** Where a move in flight will land (snapped and constrained), while the nodes follow the pointer. */
  landing?: Bounds[];
  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  createFrame: Bounds | undefined;
};

/** What the gesture in flight draws: the scene as it would be once the gesture lands. */
export const useGesturePreview = ({
  scene,
  drag,
  projection,
  minor,
  createdNode,
}: UseGesturePreviewOptions): GesturePreview => {
  /** The node a create gesture would land while one is in flight; the ghost and the frame both read it. */
  const createPreview = useMemo(
    () => (drag?.kind === 'create' ? createdNode(drag, PREVIEW_NODE_ID) : undefined),
    [drag, createdNode],
  );

  // Transient drag state is rendered by projecting it onto a copy, so links re-route while dragging and
  // a link being drawn or re-attached over a drop target looks exactly as it will once dropped. Geometry
  // previews pass through the projection's `constrain`, so a drag shows where the drop will land, and
  // `blocked` says when the drop would be refused (drawn as is, outlined in red).
  // A move follows the pointer while it moves; once it rests for `SETTLE_MS`, the shapes snap to where they will land.
  const moveRaw = drag?.kind === 'move' ? drag.raw : undefined;
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!moveRaw) {
      return;
    }
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [moveRaw?.x, moveRaw?.y]);

  const { displayScene, blocked, landing } = useMemo<{
    displayScene: View;
    blocked: boolean;
    /** Where a move in flight will land (snapped and constrained), while the nodes follow the pointer. */
    landing?: Bounds[];
  }>(() => {
    const preview = (intent: Intent) => {
      const constrained = projection.constrain ? projection.constrain(intent) : intent;
      return { displayScene: reduceIntent(scene, constrained ?? intent), blocked: constrained === undefined };
    };
    if (drag?.kind === 'move') {
      // A copy previews beside the originals, which stay; the drop mints the copies' real ids.
      const { ids, copy } = drag;
      const moveBy = (delta: Point): Intent => {
        let next = 0;
        const duplicate = copy
          ? duplicateSelection(scene, ids, delta, (prefix) => `${PREVIEW_NODE_ID}-${prefix}-${next++}`)
          : undefined;
        return duplicate ? duplicate.intent : { kind: 'move', ids, delta };
      };
      // The nodes follow the pointer smoothly; the frames they will snap to on the drop are drawn under them.
      const landed = preview(moveBy(drag.delta));
      const moved = copy
        ? Object.values(landed.displayScene.nodes).filter((node) => !scene.nodes[node.id])
        : ids.flatMap((id) => landed.displayScene.nodes[id] ?? []);
      return settled
        ? { displayScene: landed.displayScene, blocked: landed.blocked }
        : {
            displayScene: reduceIntent(scene, moveBy(drag.raw ?? drag.delta)),
            blocked: landed.blocked,
            // The landing is drawn only when the drop would be refused, the one thing following the pointer hides.
            landing: landed.blocked ? moved.map(nodeBounds) : undefined,
          };
    }
    if (drag?.kind === 'resize') {
      return preview({ kind: 'resize', id: drag.id, bounds: drag.bounds });
    }
    // A node being created previews as the type's own view inside its frame, whether drawn on the canvas
    // or dragged in from the palette (whose drag carries no image of its own).
    if (drag?.kind === 'create') {
      return createPreview ? preview({ kind: 'create', node: createPreview }) : { displayScene: scene, blocked: false };
    }
    if (drag?.kind === 'point') {
      return {
        displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { points: drag.points } }),
        blocked: false,
      };
    }
    if (drag?.kind === 'vertex') {
      // Refitted as the release will land it, so the frame and its outline follow the vertex.
      const node = scene.nodes[drag.id];
      // A locked node previews as it is, since the release will not move it.
      const values = node && !node.locked && hasVertices(node) ? refitPolyline(node, drag.points, minor) : undefined;
      return {
        displayScene: values ? reduceIntent(scene, { kind: 'update', id: drag.id, values }) : scene,
        blocked: false,
      };
    }
    // A link previews only once it has gone a grid cell, so a click with a link tool draws nothing.
    if (drag?.kind === 'link' && isLinkDrawn(drag, minor) && (drag.target || isPointEndpoint(drag.source))) {
      // A port drag previews once it reaches a target; a free-ended link previews as it will land.
      const link = createLink({
        type: drag.type,
        id: PREVIEW_LINK_ID,
        z: topZ(Object.values(scene.links)),
        source: drag.source,
        target: drag.target ?? { point: drag.to },
        midpoint: { x: (drag.from.x + drag.to.x) / 2, y: (drag.from.y + drag.to.y) / 2 },
      });
      return { displayScene: reduceIntent(scene, { kind: 'link', link }), blocked: false };
    }
    if (drag?.kind === 'end') {
      // The link is drawn as it will land: re-attached over a target, free-ended over empty canvas.
      const end: Endpoint = drag.target ?? { point: drag.to };
      return {
        displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { [drag.end]: end } }),
        blocked: false,
      };
    }
    return { displayScene: scene, blocked: false };
  }, [scene, drag, settled, createPreview, projection, minor]);

  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  const createFrame = useMemo(() => {
    const preview = createPreview && displayScene.nodes[createPreview.id];
    return preview ? nodeBounds(preview) : undefined;
  }, [createPreview, displayScene]);

  return { displayScene, blocked, landing, createFrame };
};
