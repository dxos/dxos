//
// Copyright 2026 DXOS.org
//

import {
  type ElementId,
  type Endpoint,
  type Intent,
  type Link,
  type PortalNode,
  type Scene,
  endpointNode,
} from '../model/types.ts';
import { unionBounds } from './hit.ts';
import { topZ } from './order.ts';
import { nodeBounds } from './shapes.ts';

/** What grouping a selection makes: the new scene, and the intents that replace the selection with its shape. */
export type SceneGroup = { child: Scene; intents: Intent[] };

/** `end` moved onto the scene shape when it was on a grouped node; a port of the old node means nothing there. */
const reattach = (end: Endpoint, inside: ReadonlySet<string>, portal: string): Endpoint => {
  const node = endpointNode(end);
  return node !== undefined && inside.has(node) ? { node: portal } : end;
};

/**
 * Moves the selected nodes into a new scene `id`, opened by a scene shape of the same id where they were. A link
 * between two grouped nodes moves with them; one crossing out of the group stays here, re-attached to the shape.
 * The nodes keep their coordinates: the shape frames whatever the child holds. None when no node is selected.
 */
export const groupIntoScene = (scene: Scene, ids: Iterable<ElementId>, id: string): SceneGroup | undefined => {
  const selected = new Set(ids);
  const nodes = Object.values(scene.nodes).filter((node) => selected.has(node.id));
  const bounds = unionBounds(nodes.map(nodeBounds));
  if (nodes.length === 0 || !bounds) {
    return undefined;
  }

  const inside = new Set(nodes.map((node) => node.id));
  const isInside = (end: Endpoint) => {
    const node = endpointNode(end);
    return node === undefined || inside.has(node);
  };
  const touches = (link: Link) => [link.source, link.target].some((end) => inside.has(endpointNode(end) ?? ''));
  const links = Object.values(scene.links).filter(touches);
  // A link with both ends in the group (a free end counts as either side) goes with it; the rest cross out.
  const moved = links.filter((link) => isInside(link.source) && isInside(link.target));
  const crossing = links.filter((link) => !moved.includes(link));

  const portal: PortalNode = {
    type: 'scene',
    id,
    z: topZ(Object.values(scene.nodes)),
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    size: { width: bounds.width, height: bounds.height },
    scene: id,
  };
  return {
    child: {
      id,
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
      links: Object.fromEntries(moved.map((link) => [link.id, link])),
    },
    intents: [
      { kind: 'create', node: portal },
      // Re-attached before the nodes go, since deleting a node takes the links on it.
      ...crossing.map((link): Intent => ({
        kind: 'update',
        id: link.id,
        values: { source: reattach(link.source, inside, id), target: reattach(link.target, inside, id) },
      })),
      { kind: 'delete', ids: [...inside] },
    ],
  };
};
