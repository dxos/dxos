//
// Copyright 2026 DXOS.org
//

//
// Cut, copy and paste as pure functions over the model (§8): the clipboard holds a fragment of nodes
// and the links between them; a paste mints fresh ids, offsets the fragment and returns one `batch`
// intent so the projection applies it atomically and undo takes it back in one step.
//

import {
  type Bounds,
  type ElementId,
  type Endpoint,
  type Intent,
  type LayerId,
  type Link,
  type Node,
  type Point,
  type Scene,
  isPointEndpoint,
} from '../model/types.ts';
import { unionBounds } from './hit.ts';
import { between, topZ } from './order.ts';
import { nodeBounds } from './shapes.ts';

export type Clipboard = {
  nodes: Node[];
  /** Links whose both ends are in `nodes`. */
  links: Link[];
  /** How many times this fragment has been pasted, so each paste lands one step further. */
  pasted: number;
};

/** The selected nodes and the links joining them; a link is copied whether or not it was selected. */
export const copySelection = (scene: Scene, selection: Iterable<ElementId>): Clipboard | undefined => {
  const ids = new Set(selection);
  const nodes = Object.values(scene.nodes).filter((node) => ids.has(node.id));
  const nodeIds = new Set(nodes.map(({ id }) => id));
  // A link comes along when every node end is in the fragment and at least one end is (a free end travels
  // with the node it is drawn to); a link with two free ends comes only when it is selected itself.
  const inFragment = (end: Endpoint) => isPointEndpoint(end) || nodeIds.has(end.node);
  const attached = (end: Endpoint) => !isPointEndpoint(end) && nodeIds.has(end.node);
  const links = Object.values(scene.links).filter(
    (link) =>
      inFragment(link.source) &&
      inFragment(link.target) &&
      (ids.has(link.id) || attached(link.source) || attached(link.target)),
  );
  return nodes.length > 0 ? { nodes, links, pasted: 0 } : undefined;
};

export const clipboardBounds = (clipboard: Clipboard): Bounds | undefined =>
  unionBounds(clipboard.nodes.map(nodeBounds));

export type PasteOptions = {
  clipboard: Clipboard;
  /** Scene-space offset applied to every node and control point. */
  offset: Point;
  createId: (prefix: string) => string;
  /** Z keys for the pasted nodes and links, above the scene. */
  nodeZ: (index: number) => string;
  linkZ: (index: number) => string;
  /** The layer the pasted elements go on; unset, each keeps its own. */
  layer?: LayerId;
};

export type Paste = { intent: Intent; ids: ElementId[] };

/** The batch that recreates the fragment with fresh ids at `offset`, and the ids it will create. */
export const pasteFragment = ({ clipboard, offset, createId, nodeZ, linkZ, layer }: PasteOptions): Paste => {
  const idMap = new Map<ElementId, ElementId>();
  const shift = (point: Point): Point => ({ x: point.x + offset.x, y: point.y + offset.y });
  const onLayer = layer !== undefined ? { layer } : {};
  const nodes: Node[] = clipboard.nodes.map((node, index) => {
    const id = createId(node.type);
    idMap.set(node.id, id);
    // A pasted portal shares the child scene: two portals to one scene are Muse "linked cards" (§4).
    return { ...node, ...onLayer, id, z: nodeZ(index), center: shift(node.center) };
  });
  const links: Link[] = clipboard.links.map((link, index) => {
    const id = createId(link.type);
    idMap.set(link.id, id);
    const remap = (end: Endpoint): Endpoint =>
      isPointEndpoint(end) ? { point: shift(end.point) } : { ...end, node: idMap.get(end.node) ?? end.node };
    const ends = { source: remap(link.source), target: remap(link.target) };
    return link.type === 'spline'
      ? { ...link, ...onLayer, id, z: linkZ(index), ...ends, points: link.points.map(shift) }
      : { ...link, ...onLayer, id, z: linkZ(index), ...ends };
  });
  return {
    intent: {
      kind: 'batch',
      intents: [
        ...nodes.map((node): Intent => ({ kind: 'create', node })),
        ...links.map((link): Intent => ({ kind: 'link', link })),
      ],
    },
    ids: [...nodes.map(({ id }) => id), ...links.map(({ id }) => id)],
  };
};

/**
 * The batch that copies the selected nodes (and the links between them) `offset` away, above everything
 * else, and the ids it creates; nothing when the selection holds no node.
 */
export const duplicateSelection = (
  scene: Scene,
  selection: Iterable<ElementId>,
  offset: Point,
  createId: (prefix: string) => string,
): Paste | undefined => {
  const clipboard = copySelection(scene, selection);
  if (!clipboard) {
    return undefined;
  }
  let nodeZ = topZ(Object.values(scene.nodes));
  let linkZ = topZ(Object.values(scene.links));
  return pasteFragment({
    clipboard,
    offset,
    createId,
    nodeZ: () => (nodeZ = between(nodeZ, undefined)),
    linkZ: () => (linkZ = between(linkZ, undefined)),
  });
};
