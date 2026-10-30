//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Bounds, type Endpoint, type Point, isPointEndpoint } from '@dxos/scene';

import { type Drag, type DrawScene } from '../../engine/index.ts';
import { type View } from '../../model/index.ts';
import {
  type SceneEdit,
  createLink,
  duplicateSelection,
  hasVertices,
  insertLink,
  insertNode,
  moveNodes,
  nodeBounds,
  refitPolyline,
  resizeTo,
  topZ,
  updateElement,
} from '../../utils/index.ts';
import { type PointerMachine, PREVIEW_NODE_ID, isLinkDrawn } from './usePointerMachine.ts';
import { detentOf } from './useSceneSnap.ts';

/** The link drawn as a preview during a drag; it never reaches the model. */
const PREVIEW_LINK_ID = 'preview-link';

export type UseGesturePreviewOptions = {
  scene: View;
  drag: Drag | undefined;
  draw: DrawScene;
  /** The finest grid level drawn: a link previews once it has gone this far. */
  minor: number;
  /** How near, in scene units, a moved shape must come to where it lands to be held there. */
  detent: number;
} & Pick<PointerMachine, 'createdNode'>;

export type GesturePreview = {
  /** The scene as drawn while the gesture is in flight. */
  displayScene: View;
  /** The gesture would be refused by the layout's mode (e.g. an overlap on the lattice). */
  blocked: boolean;
  /** Where a move in flight will land (snapped and constrained), while the nodes follow the pointer. */
  landing?: Bounds[];
  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  createFrame: Bounds | undefined;
};

type Preview = {
  displayScene: View;
  blocked: boolean;
  /** Where a move in flight will land (snapped and constrained), while the nodes follow the pointer. */
  landing?: Bounds[];
};

/**
 * What a move in flight draws: the nodes at the offset the snap gave the drag, each held on the axis of where the
 * layout's mode lands it (a lattice cell) while within `detent` of it, so a shape clicks into place and out again
 * rather than jumping there.
 */
export const movePreview = (
  scene: View,
  drag: Extract<Drag, { kind: 'move' }>,
  draw: Pick<DrawScene, 'constrain'>,
  detent: number,
): Preview => {
  // A copy previews beside the originals, which stay; the drop mints the copies' real ids.
  const { ids, copy } = drag;
  const moveBy = (delta: Point): SceneEdit => {
    let next = 0;
    const duplicate = copy
      ? duplicateSelection(scene, ids, delta, (prefix) => `${PREVIEW_NODE_ID}-${prefix}-${next++}`)
      : undefined;
    return duplicate ? duplicate.edit : moveNodes(ids, delta);
  };
  const edit = moveBy(drag.delta);
  const followed = edit(scene);
  const constrained = draw.constrain ? draw.constrain(edit) : edit;
  const landed = (constrained ?? edit)(scene);
  const moved = copy ? Object.keys(followed.nodes).filter((id) => !scene.nodes[id]) : ids;
  if (constrained === undefined) {
    return {
      displayScene: followed,
      blocked: true,
      // The landing is drawn only when the drop would be refused, the one thing following the pointer hides.
      landing: moved.flatMap((id) => (landed.nodes[id] ? [nodeBounds(landed.nodes[id])] : [])),
    };
  }
  const nodes = { ...followed.nodes };
  for (const id of moved) {
    const [follow, land] = [followed.nodes[id], landed.nodes[id]];
    if (follow && land) {
      const center = {
        x: detentOf(follow.center.x, land.center.x, detent),
        y: detentOf(follow.center.y, land.center.y, detent),
      };
      // Held on both axes it is the landing itself, size included (a lattice may round the span).
      nodes[id] = center.x === land.center.x && center.y === land.center.y ? land : { ...follow, center };
    }
  }
  return { displayScene: { ...followed, nodes }, blocked: false };
};

/** What the gesture in flight draws: the scene as it would be once the gesture lands. */
export const useGesturePreview = ({
  scene,
  drag,
  draw,
  minor,
  detent,
  createdNode,
}: UseGesturePreviewOptions): GesturePreview => {
  /** The node a create gesture would land while one is in flight; the ghost and the frame both read it. */
  const createPreview = useMemo(
    () => (drag?.kind === 'create' ? createdNode(drag, PREVIEW_NODE_ID) : undefined),
    [drag, createdNode],
  );

  // Transient drag state is rendered by applying it to a copy, so links re-route while dragging and
  // a link being drawn or re-attached over a drop target looks exactly as it will once dropped. Geometry
  // previews pass through the layout's `constrain`, so a drag shows where the drop will land, and
  // `blocked` says when the drop would be refused (drawn as is, outlined in red).
  const { displayScene, blocked, landing } = useMemo<Preview>(() => {
    const preview = (edit: SceneEdit) => {
      const constrained = draw.constrain ? draw.constrain(edit) : edit;
      return { displayScene: (constrained ?? edit)(scene), blocked: constrained === undefined };
    };
    if (drag?.kind === 'move') {
      return movePreview(scene, drag, draw, detent);
    }
    if (drag?.kind === 'resize') {
      return preview(resizeTo(drag.id, drag.bounds));
    }
    // A node being created previews as the type's own view inside its frame, whether drawn on the canvas
    // or dragged in from the palette (whose drag carries no image of its own).
    if (drag?.kind === 'create') {
      return createPreview ? preview(insertNode(createPreview)) : { displayScene: scene, blocked: false };
    }
    if (drag?.kind === 'point') {
      return {
        displayScene: updateElement(drag.id, { points: drag.points })(scene),
        blocked: false,
      };
    }
    if (drag?.kind === 'vertex') {
      // Refitted as the release will land it, so the frame and its outline follow the vertex.
      const node = scene.nodes[drag.id];
      // A locked node previews as it is, since the release will not move it.
      const values = node && !node.locked && hasVertices(node) ? refitPolyline(node, drag.points, minor) : undefined;
      return {
        displayScene: values ? updateElement(drag.id, values)(scene) : scene,
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
      });
      return { displayScene: insertLink(link)(scene), blocked: false };
    }
    if (drag?.kind === 'end') {
      // The link is drawn as it will land: re-attached over a target, free-ended over empty canvas.
      const end: Endpoint = drag.target ?? { point: drag.to };
      return {
        displayScene: updateElement(drag.id, { [drag.end]: end })(scene),
        blocked: false,
      };
    }
    return { displayScene: scene, blocked: false };
  }, [scene, drag, detent, createPreview, draw, minor]);

  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  const createFrame = useMemo(() => {
    const preview = createPreview && displayScene.nodes[createPreview.id];
    return preview ? nodeBounds(preview) : undefined;
  }, [createPreview, displayScene]);

  return { displayScene, blocked, landing, createFrame };
};
