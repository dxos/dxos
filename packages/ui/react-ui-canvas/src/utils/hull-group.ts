//
// Copyright 2026 DXOS.org
//

//
// A hull is stored as a group: an Instance (`hull`) of an anonymous composite whose parts are the nodes inside it,
// exactly as the Group command makes one. The 2D editor does not draw it that way. It opens the group out, so the
// parts stand in the scene beside everything else (each naming the hull as its `parent`) and a `hull` node stands
// for the Instance: a part is then selected, moved and linked like any other node, a link from outside ends at the
// part rather than at the group's frame, and every part is on the scene's own lattice. `expandHulls` opens the groups
// of the lists read from a document and `collapseHulls` closes them again before a change is written, so what is
// stored is always the group.
//

import {
  type Endpoint,
  HULL_SHAPES,
  type HullNode,
  type HullShape,
  type Link,
  type Node,
  type PartLayout,
  type PlacedComposite,
  type Point,
  endpointNode,
  isHullNode,
  isInstanceNode,
} from '@dxos/scene';

import { type RenderList2D, type RenderLists2D } from '../model/index.ts';
import { compositeBounds, instancePorts } from './compose.ts';
import { unionBounds } from './hit.ts';
import { between, sortByZ } from './order.ts';
import { nodeBounds } from './shapes.ts';

/** A hull as it is stored: a group's Instance, with the border it draws, its inset and the name it carries. */
type HullGroup = PlacedComposite & { readonly hull: HullShape; readonly hullInset?: number; readonly label?: string };

const isHullShape = (value: unknown): value is HullShape => HULL_SHAPES.some((shape) => shape === value);

/** The border an Instance draws round its parts, where it is a hull's group. */
export const groupHull = (node: Node): HullShape | undefined => {
  const hull: unknown = Reflect.get(node, 'hull');
  return isInstanceNode(node) && isHullShape(hull) ? hull : undefined;
};

const labelOf = (node: Node): string | undefined => {
  const label: unknown = Reflect.get(node, 'label');
  return typeof label === 'string' ? label : undefined;
};

const insetOf = (node: Node): number | undefined => {
  const inset: unknown = Reflect.get(node, isHullNode(node) ? 'inset' : 'hullInset');
  return typeof inset === 'number' ? inset : undefined;
};

/** The fields a hull and its group's Instance share: what the hull looks like and where it is in the stack. */
const shared = (node: Node) => ({
  ...(labelOf(node) !== undefined ? { label: labelOf(node) } : {}),
  ...(node.style ? { style: node.style } : {}),
  ...(node.class !== undefined ? { class: node.class } : {}),
  ...(node.layer !== undefined ? { layer: node.layer } : {}),
  ...(node.locked !== undefined ? { locked: node.locked } : {}),
});

const moved = (point: Point, by: Point): Point => ({ x: point.x + by.x, y: point.y + by.y });

const movedEnd = (end: Endpoint, by: Point): Endpoint => ('point' in end ? { point: moved(end.point, by) } : end);

const movedLink = (link: Link, by: Point): Link => ({
  ...link,
  source: movedEnd(link.source, by),
  target: movedEnd(link.target, by),
  ...(link.type === 'spline' ? { points: link.points.map((point) => moved(point, by)) } : {}),
});

/** A scene with one hull's group opened out in it. */
const expandGroup = (scene: RenderList2D, instance: PlacedComposite, shape: HullShape, composite: RenderList2D) => {
  const content = compositeBounds(composite);
  // The parts keep their places about the composite's own centre, which the Instance stands on.
  const by = content
    ? {
        x: instance.center.x - (content.x + content.width / 2),
        y: instance.center.y - (content.y + content.height / 2),
      }
    : instance.center;
  const members = Object.values(composite.nodes).map((part): Node => {
    const { exposed: _exposed, constrain: _constrain, ...rest } = part;
    return { ...rest, center: moved(part.center, by), parent: instance.id };
  });
  const inner = Object.values(composite.links).map((link): Link => {
    const { constrain: _constrain, ...rest } = movedLink(link, by);
    return rest;
  });
  // Under its own shapes however the Instance is stacked, so a press on a shape inside it reaches the shape.
  const [lowest] = sortByZ(members);
  const hull: HullNode = {
    type: 'hull',
    id: instance.id,
    z: lowest === undefined || instance.z < lowest.z ? instance.z : between(undefined, lowest.z),
    center: instance.center,
    size: instance.size,
    shape,
    group: instance.composite,
    ...(insetOf(instance) !== undefined ? { inset: insetOf(instance) } : {}),
    ...shared(instance),
  };
  // A link from outside ended at the group, on the port named by the part it was drawn to: it ends at the part again.
  const onPart = (end: Endpoint): Endpoint =>
    'node' in end && end.node === instance.id && end.port !== undefined && composite.nodes[end.port] !== undefined
      ? { node: end.port }
      : end;
  const outer = Object.values(scene.links).map((link): Link => {
    const [source, target] = [onPart(link.source), onPart(link.target)];
    return source === link.source && target === link.target ? link : { ...link, source, target };
  });
  return {
    ...scene,
    nodes: {
      ...scene.nodes,
      [hull.id]: hull,
      ...Object.fromEntries(members.map((member) => [member.id, member])),
    },
    links: Object.fromEntries([...outer, ...inner].map((link) => [link.id, link])),
  };
};

/**
 * The lists with every hull's group opened out in the scene that places it, and the group's own list left out. A
 * group is left closed (and so drawn as any other Instance) where opening it would not be the same drawing: one
 * placed more than once, one placed inside another Object, or one whose parts share an id with the scene around it.
 * Lists with no hull come back as they are.
 */
export const expandHulls = (lists: RenderLists2D): RenderLists2D => {
  const placements = new Map<string, number>();
  for (const list of Object.values(lists)) {
    for (const node of Object.values(list.nodes)) {
      isInstanceNode(node) && placements.set(node.composite, (placements.get(node.composite) ?? 0) + 1);
    }
  }
  const next: Record<string, RenderList2D> = { ...lists };
  let changed = false;
  for (const list of Object.values(lists)) {
    if (list.kind === 'composite') {
      continue;
    }
    let scene = list;
    for (const node of Object.values(list.nodes)) {
      const shape = groupHull(node);
      const composite = isInstanceNode(node) ? lists[node.composite] : undefined;
      if (!shape || !isInstanceNode(node) || !composite || placements.get(node.composite) !== 1) {
        continue;
      }
      const clashes = [...Object.keys(composite.nodes), ...Object.keys(composite.links)].some(
        (id) => scene.nodes[id] !== undefined || scene.links[id] !== undefined,
      );
      if (clashes) {
        continue;
      }
      scene = expandGroup(scene, node, shape, composite);
      delete next[composite.id];
      changed = true;
    }
    next[list.id] = scene;
  }
  return changed ? next : lists;
};

/** The id a new hull's nodes are stored under: the hull's own, so it is the same each time the hull is closed. */
const groupId = (hull: HullNode): string => hull.group ?? `${hull.id}-parts`;

/** A scene with one hull closed into its group, and the group. */
const collapseGroup = (
  scene: RenderList2D,
  hull: HullNode,
  members: readonly Node[],
): { scene: RenderList2D; composite: RenderList2D } | undefined => {
  const bounds = unionBounds(members.map(nodeBounds));
  if (!bounds) {
    return undefined;
  }
  const inside = new Set(members.map((member) => member.id));
  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const back = { x: -centre.x, y: -centre.y };
  const within = (end: Endpoint) => {
    const node = endpointNode(end);
    return node === undefined || inside.has(node);
  };
  const touching = Object.values(scene.links).filter((link) =>
    [link.source, link.target].some((end) => inside.has(endpointNode(end) ?? '')),
  );
  const inner = touching.filter((link) => within(link.source) && within(link.target));
  const crossing = touching.filter((link) => !inner.includes(link));
  // The part at the inside end of a link that crosses the border is exposed, so the Instance offers a port for it.
  const exposed = new Set(crossing.flatMap((link) => [link.source, link.target].map(endpointNode)));
  // As the Group command lays parts out: one part follows the frame, several keep their proportions of it.
  const constrain: PartLayout = members.length === 1 ? { x: 'stretch', y: 'stretch' } : { x: 'scale', y: 'scale' };
  const parts = members.map((member): Node => {
    const { parent: _parent, ...rest } = member;
    return {
      ...rest,
      center: moved(member.center, back),
      constrain,
      ...(exposed.has(member.id) ? { exposed: true } : {}),
    };
  });
  const composite: RenderList2D = {
    id: groupId(hull),
    name: labelOf(hull) ?? 'Hull',
    kind: 'composite',
    anonymous: true,
    nodes: Object.fromEntries(parts.map((part) => [part.id, part])),
    links: Object.fromEntries(inner.map((link) => [link.id, { ...movedLink(link, back), constrain }])),
    ...(scene.layers ? { layers: scene.layers } : {}),
  };
  const instance: HullGroup = {
    type: 'instance',
    id: hull.id,
    z: hull.z,
    center: centre,
    size: { width: bounds.width, height: bounds.height },
    composite: composite.id,
    // The frame is the parts' own box, so they are drawn where they stand.
    fit: 'none',
    ports: instancePorts(bounds, composite),
    hull: hull.shape ?? 'perimeter',
    ...(insetOf(hull) !== undefined ? { hullInset: insetOf(hull) } : {}),
    ...shared(hull),
  };
  const onGroup = (end: Endpoint): Endpoint => {
    const node = endpointNode(end);
    return node !== undefined && inside.has(node) ? { node: hull.id, port: node } : end;
  };
  const nodes = Object.fromEntries(
    Object.values(scene.nodes)
      .filter((node) => !inside.has(node.id))
      .map((node): [string, Node] => [node.id, node.id === hull.id ? instance : node]),
  );
  const links = Object.fromEntries(
    Object.values(scene.links)
      .filter((link) => !inner.includes(link))
      .map((link): [string, Link] => [
        link.id,
        crossing.includes(link) ? { ...link, source: onGroup(link.source), target: onGroup(link.target) } : link,
      ]),
  );
  return { scene: { ...scene, nodes, links }, composite };
};

/**
 * The lists with every hull closed into its group: the nodes naming it as their `parent`, and the links among them,
 * move into the group's own list about their centre, one Instance takes the hull's place over their box, and a link
 * that crosses the border ends at the Instance on the port named by the part. A hull with nothing inside it has no
 * group and stays a `hull` node; a node naming a hull that is not there names nothing. Lists with no hull come back
 * as they are.
 */
export const collapseHulls = (lists: RenderLists2D): RenderLists2D => {
  const next: Record<string, RenderList2D> = { ...lists };
  let changed = false;
  for (const list of Object.values(lists)) {
    let scene = list;
    for (const hull of Object.values(list.nodes).filter(isHullNode)) {
      const members = Object.values(scene.nodes).filter((node) => node.parent === hull.id && !isHullNode(node));
      const collapsed = members.length > 0 ? collapseGroup(scene, hull, members) : undefined;
      if (collapsed) {
        scene = collapsed.scene;
        next[collapsed.composite.id] = collapsed.composite;
      }
    }
    // What is left naming a parent names a hull that has gone, or is a hull, which stands inside nothing.
    if (Object.values(scene.nodes).some((node) => node.parent !== undefined)) {
      scene = {
        ...scene,
        nodes: Object.fromEntries(
          Object.values(scene.nodes).map((node): [string, Node] => {
            const { parent: _parent, ...rest } = node;
            return [node.id, node.parent === undefined ? node : rest];
          }),
        ),
      };
    }
    if (scene !== list) {
      next[list.id] = scene;
      changed = true;
    }
  }
  return changed ? next : lists;
};
