//
// Copyright 2026 DXOS.org
//

import {
  type Element,
  type ElementId,
  type Endpoint,
  type FrameNode,
  type Intent,
  type LayerId,
  type Link,
  type Node,
  type NodeId,
  type Point,
  type Scene,
  endpointNode,
  isFrameNode,
  isPointEndpoint,
} from '../model/types.ts';
import { boundsCenter } from './camera.ts';
import { unionBounds } from './hit.ts';
import { elementLayer, sceneLayers } from './layers.ts';
import { between, sortByZ, topZ } from './order.ts';
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
 * The nodes keep their coordinates: the shape frames whatever the child holds. None when no node is selected, or
 * when a selected node is locked. The shape goes on `layer`; the new scene has the layers its elements were on.
 */
export const groupIntoScene = (
  scene: Scene,
  ids: Iterable<ElementId>,
  id: string,
  layer?: LayerId,
): SceneGroup | undefined => {
  const selected = new Set(ids);
  const nodes = Object.values(scene.nodes).filter((node) => selected.has(node.id));
  const bounds = unionBounds(nodes.map(nodeBounds));
  // A locked node may not leave its scene, so a selection holding one is not grouped at all.
  if (nodes.length === 0 || !bounds || nodes.some((node) => node.locked)) {
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

  const portal: FrameNode = {
    type: 'frame',
    id,
    z: topZ(Object.values(scene.nodes)),
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    size: { width: bounds.width, height: bounds.height },
    scene: id,
    ...(layer !== undefined ? { layer } : {}),
  };
  // Each element names the layer it resolved to here, and the new scene has those layers, in their order.
  const layers = sceneLayers(scene);
  const placed = <T extends Element>(element: T): T => ({ ...element, layer: elementLayer(element, layers) });
  const childNodes = nodes.map(placed);
  const childLinks = moved.map(placed);
  const used = new Set([...childNodes, ...childLinks].map((element) => element.layer));
  return {
    child: {
      id,
      nodes: Object.fromEntries(childNodes.map((node) => [node.id, node])),
      links: Object.fromEntries(childLinks.map((link) => [link.id, link])),
      layers: Object.fromEntries(layers.filter((entry) => used.has(entry.id)).map((entry) => [entry.id, entry])),
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

export type UngroupOptions = {
  /** Another frame still opens the child scene, which stays, so every element it brings needs a new id. */
  shared?: boolean;
  /** Mints an id for an element whose own is taken (`prefix` is its type). */
  createId: (prefix: string) => string;
  /** Ids taken elsewhere besides the scene itself, e.g. in other scenes of a host that keys records by id. */
  taken?: ReadonlySet<string>;
};

/**
 * The inverse of `groupIntoScene`: the intents that replace the frame `frameId` with the contents of its `child`
 * scene. The child's nodes are mapped onto the frame as it is now: the bounds of the nodes themselves (not the padded
 * region a portal draws them in, so grouping then ungrouping restores them exactly) are centred on the frame and
 * shrunk to fit it, never magnified, so a moved or resized frame takes its contents with it. They go on
 * the frame's layer, above everything else, in their own order. A link on the frame re-attaches to the child node
 * nearest its other end. An element keeps its id unless the scene already has it or the child is `shared`. None when
 * the frame is missing, locked, not a frame, or opens another scene.
 */
export const ungroupScene = (
  scene: Scene,
  frameId: NodeId,
  child: Scene,
  { shared = false, createId, taken: elsewhere }: UngroupOptions,
): Intent[] | undefined => {
  const frame = scene.nodes[frameId];
  if (!frame || !isFrameNode(frame) || frame.locked || frame.scene !== child.id) {
    return undefined;
  }

  const target = nodeBounds(frame);
  const source = unionBounds(Object.values(child.nodes).map(nodeBounds));
  const scale = source ? 1 / Math.max(1, source.width / target.width, source.height / target.height) : 1;
  const from = source ? boundsCenter(source) : { x: 0, y: 0 };
  const to = boundsCenter(target);
  const map = (point: Point): Point => ({ x: to.x + (point.x - from.x) * scale, y: to.y + (point.y - from.y) * scale });

  const taken = new Set([...Object.keys(scene.nodes), ...Object.keys(scene.links), ...(elsewhere ?? [])]);
  const ids = new Map<ElementId, ElementId>();
  const rename = (element: Element & { type: string }): ElementId => {
    const id = shared || taken.has(element.id) ? createId(element.type) : element.id;
    ids.set(element.id, id);
    return id;
  };
  const layer = elementLayer(frame, sceneLayers(scene));

  let nodeZ = topZ(Object.values(scene.nodes));
  const nodes: Node[] = sortByZ(Object.values(child.nodes)).map((node) => ({
    ...node,
    id: rename(node),
    z: (nodeZ = between(nodeZ, undefined)),
    layer,
    center: map(node.center),
    size: { width: node.size.width * scale, height: node.size.height * scale },
  }));

  let linkZ = topZ(Object.values(scene.links));
  const remap = (end: Endpoint): Endpoint =>
    isPointEndpoint(end) ? { point: map(end.point) } : { ...end, node: ids.get(end.node) ?? end.node };
  const links: Link[] = sortByZ(Object.values(child.links)).map((link) => {
    const id = rename(link);
    const base = {
      id,
      z: (linkZ = between(linkZ, undefined)),
      layer,
      source: remap(link.source),
      target: remap(link.target),
    };
    return link.type === 'spline' ? { ...link, ...base, points: link.points.map(map) } : { ...link, ...base };
  });

  // Where a link's other end is, so it re-attaches to the child node nearest it.
  const position = (end: Endpoint): Point | undefined => {
    if (isPointEndpoint(end)) {
      return end.point;
    }
    return scene.nodes[end.node]?.center;
  };
  const nearest = (point: Point | undefined): NodeId | undefined => {
    let best: { id: NodeId; distance: number } | undefined;
    for (const node of nodes) {
      const distance = point ? Math.hypot(node.center.x - point.x, node.center.y - point.y) : 0;
      if (!best || distance < best.distance) {
        best = { id: node.id, distance };
      }
    }
    return best?.id;
  };
  const onFrame = (end: Endpoint) => endpointNode(end) === frameId;
  const reattached = Object.values(scene.links).flatMap((link): Intent[] => {
    if (!onFrame(link.source) && !onFrame(link.target)) {
      return [];
    }
    const near = nearest(position(onFrame(link.source) ? link.target : link.source));
    if (near === undefined) {
      return [];
    }
    const end = (value: Endpoint): Endpoint => (onFrame(value) ? { node: near } : value);
    return [{ kind: 'update', id: link.id, values: { source: end(link.source), target: end(link.target) } }];
  });

  return [
    ...nodes.map((node): Intent => ({ kind: 'create', node })),
    ...links.map((link): Intent => ({ kind: 'link', link })),
    // Re-attached before the frame goes, since deleting a node takes the links still on it.
    ...reattached,
    { kind: 'delete', ids: [frameId] },
  ];
};
