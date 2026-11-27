//
// Copyright 2026 DXOS.org
//

//
// Composite objects (ANIMATION.md §4): a composite is a scene marked `kind: 'composite'`; an instance node draws it at
// its own place and size. Grouping a selection as an object, ungrouping an instance and making one unique are pure
// functions here that return the scenes and edits the view applies, so each is one undoable step.
//

import {
  type Bounds,
  type Endpoint,
  type InstanceFit,
  type LayerId,
  type Link,
  type Node,
  type NodeId,
  type PartLayout,
  type PlacedComposite,
  type Point,
  type Port,
  type Side,
  type ViewId,
  endpointNode,
  hasConstraints,
  isInstanceNode,
  isPointEndpoint,
  isViewNode,
  mapPoint,
  nodeFrame,
  pointBounds,
  sidePort,
  solvePartBounds,
} from '@dxos/scene';

import { type RenderList2D, type RenderLists2D, pruneOrphaned } from '../model/index.ts';
import { type SceneEdit, updateElement } from './edits.ts';
import { unionBounds } from './hit.ts';
import { elementLayer, viewLayers } from './layers.ts';
import { topZ } from './order.ts';
import { type PartField, fieldName, fieldValue, fieldValues } from './parts.ts';
import { nodeBounds } from './shapes.ts';

/** Whether a scene is a composite's definition. */
export const isComposite = (scene: RenderList2D | undefined): boolean => scene?.kind === 'composite';

/** The composites of a drawing, by name. */
export const compositeViews = (scenes: RenderLists2D): RenderList2D[] =>
  Object.values(scenes)
    .filter(isComposite)
    .sort((left, right) => (left.name ?? left.id).localeCompare(right.name ?? right.id));

/** Whether a scene is an anonymous Object: one the Group command made, not yet named or placed again. */
export const isAnonymous = (scene: RenderList2D | undefined): boolean =>
  isComposite(scene) && scene?.anonymous === true;

/** The Objects library: the composites by name, without the anonymous ones (VIEWS.md §4.4). */
export const libraryViews = (scenes: RenderLists2D): RenderList2D[] =>
  compositeViews(scenes).filter((scene) => !isAnonymous(scene));

/** `scene` named or placed again, so it joins the library; the same scene when it was not anonymous. */
export const promoted = (scene: RenderList2D): RenderList2D => {
  if (scene.anonymous === undefined) {
    return scene;
  }
  const { anonymous: _, ...rest } = scene;
  return rest;
};

/**
 * The anonymous Objects that `nodes` place again, promoted (VIEWS.md §4.4): what a paste or a duplicate writes into
 * the store with its edit. Empty when none of them is an Instance of an anonymous Object in `scenes`.
 */
export const promotedBy = (scenes: RenderLists2D, nodes: Iterable<Node>): Record<ViewId, RenderList2D> => {
  const result: Record<ViewId, RenderList2D> = {};
  for (const node of nodes) {
    const definition = isInstanceNode(node) ? scenes[node.composite] : undefined;
    if (definition && isAnonymous(definition)) {
      result[definition.id] = promoted(definition);
    }
  }
  return result;
};

/** How many instances of each composite the drawing holds, in any scene. */
export const instanceCounts = (scenes: RenderLists2D): Record<ViewId, number> => {
  const counts: Record<ViewId, number> = {};
  for (const scene of Object.values(scenes)) {
    for (const node of Object.values(scene.nodes)) {
      if (isInstanceNode(node)) {
        counts[node.composite] = (counts[node.composite] ?? 0) + 1;
      }
    }
  }
  return counts;
};

/**
 * `views` without the composite `composite` and, with `instances`, without every Instance of it and the links on them;
 * the records only those Instances pointed at (an anonymous Object or a View inside one) go too. Undefined when the
 * composite is still placed and `instances` is off, as deleting it would leave Instances drawing nothing.
 */
export const removeComposite = (
  views: RenderLists2D,
  composite: ViewId,
  { instances, roots }: { instances: boolean; roots: readonly ViewId[] },
): RenderLists2D | undefined => {
  if (!instances && (instanceCounts(views)[composite] ?? 0) > 0) {
    return undefined;
  }
  const { [composite]: _, ...rest } = views;
  const next = Object.fromEntries(
    Object.entries(rest).map(([id, view]): [ViewId, RenderList2D] => {
      const gone = new Set(
        Object.values(view.nodes).flatMap((node) =>
          isInstanceNode(node) && node.composite === composite ? [node.id] : [],
        ),
      );
      if (gone.size === 0) {
        return [id, view];
      }
      const touches = (link: Link) => [link.source, link.target].some((end) => gone.has(endpointNode(end) ?? ''));
      return [
        id,
        {
          ...view,
          nodes: Object.fromEntries(Object.entries(view.nodes).filter(([nodeId]) => !gone.has(nodeId))),
          links: Object.fromEntries(Object.entries(view.links).filter(([, link]) => !touches(link))),
        },
      ];
    }),
  );
  return pruneOrphaned(views, next, roots);
};

/** The box a composite's nodes fill, unpadded: what an instance scales into its frame. */
export const compositeBounds = (composite: RenderList2D): Bounds | undefined =>
  unionBounds(Object.values(composite.nodes).map(nodeBounds));

/** How an instance maps its composite's coordinates into its own frame: scaled, then moved. */
export type InstanceTransform = { scale: number; offset: Point };

/** The composite point `point` as it lands in the scene the instance is in. */
export const toInstance = ({ scale, offset }: InstanceTransform, point: Point): Point => ({
  x: offset.x + point.x * scale,
  y: offset.y + point.y * scale,
});

/** The transform that draws `content` in `frame`: uniformly scaled to fit inside, to fill, or at true size; centred. */
export const instanceTransform = (
  frame: Bounds,
  content: Bounds | undefined,
  fit: InstanceFit = 'fit',
): InstanceTransform => {
  if (!content || content.width <= 0 || content.height <= 0) {
    return { scale: 1, offset: { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 } };
  }
  const scaleX = frame.width / content.width;
  const scaleY = frame.height / content.height;
  const scale = fit === 'none' ? 1 : fit === 'fill' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const centre = { x: content.x + content.width / 2, y: content.y + content.height / 2 };
  return {
    scale,
    offset: { x: frame.x + frame.width / 2 - centre.x * scale, y: frame.y + frame.height / 2 - centre.y * scale },
  };
};

/** The composite's node with this instance's values for it, shallow per field (`overrides` merges per key). */
export const overriddenNode = (instance: PlacedComposite, node: Node): Node => {
  const override = instance.partOverrides?.[node.id];
  if (!override) {
    return node;
  }
  const look = Reflect.get(override, 'overrides');
  return {
    ...node,
    ...override,
    id: node.id,
    kind: node.kind,
    ...(typeof look === 'object' && look !== null ? { overrides: { ...node.overrides, ...look } } : {}),
  };
};

/** A bound value as a part's text: a list reads one entry per line, as the part that edits it writes it back. */
const boundText = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string').join('\n');
  }
  return typeof value === 'string' ? value : undefined;
};

/**
 * The part showing the Instance's own field (`bind`), where it names one the Instance carries. A tool that keeps
 * typed data on its shape — a UML class's attributes — draws it through a part this way, so the composite says how
 * the shape is laid out and the Instance stays the thing that holds the data.
 */
export const boundNode = (instance: PlacedComposite, node: Node, fields: readonly PartField[]): Node => {
  if (node.bind === undefined) {
    return node;
  }
  const value = fieldValue(instance, node.bind);
  if (value === undefined) {
    return node;
  }
  const text = boundText(value);
  const [part] = fields;
  // Text reaches the part's own text field, whatever the Instance calls it, so a class's `attributes` fill a note's
  // `label`. Anything else — a glyph, a number — is written under the name it binds, which the part's kind reads.
  return text !== undefined && part
    ? { ...node, ...fieldValues(node, part.field, text) }
    : { ...node, [fieldName(node.bind)]: value };
};

/**
 * The composite without the parts an Instance has turned off, each grower taking the room of the hidden parts it
 * names (`grow`), so a card with its footer off grows its body into the space rather than leaving a gap. The frame
 * the parts are solved against is unchanged: turning a part off redistributes the inside, it does not resize the
 * Object. A link with an end on a hidden part goes with it.
 */
export const visibleParts = (view: RenderList2D): RenderList2D => {
  const hidden = new Set(Object.values(view.nodes).flatMap((node) => (node.hidden === true ? [node.id] : [])));
  if (hidden.size === 0) {
    return view;
  }
  // A part that belongs to another goes with it, however deep the chain: a hairline follows its footer.
  for (let added = true; added;) {
    added = false;
    for (const node of Object.values(view.nodes)) {
      if (node.follows !== undefined && hidden.has(node.follows) && !hidden.has(node.id)) {
        hidden.add(node.id);
        added = true;
      }
    }
  }
  const boundsOf = (id: NodeId): Bounds[] => {
    const node = view.nodes[id];
    return node ? [nodeBounds(node)] : [];
  };
  const grown = Object.values(view.nodes)
    .filter((node) => !hidden.has(node.id))
    .map((node): Node => {
      const taken = (node.grow ?? '').split(/\s+/).filter((id) => hidden.has(id));
      const box = taken.length === 0 ? undefined : unionBounds([nodeBounds(node), ...taken.flatMap(boundsOf)]);
      return box ? { ...node, center: boundsCentre(box), size: { width: box.width, height: box.height } } : node;
    });
  const touches = (link: Link) => [link.source, link.target].some((end) => hidden.has(endpointNode(end) ?? ''));
  return {
    ...view,
    nodes: Object.fromEntries(grown.map((node) => [node.id, node])),
    links: Object.fromEntries(Object.entries(view.links).filter(([, link]) => !touches(link))),
  };
};

/**
 * The composite with an instance's part overrides applied to its nodes and its bound parts filled in, as the instance
 * draws it. `parts` says where a node kind keeps its text, so a bound part writes into the right field.
 */
export const instanceView = (
  instance: PlacedComposite,
  composite: RenderList2D,
  parts: (node: Node) => readonly PartField[] = () => [],
): RenderList2D => {
  const bound = Object.values(composite.nodes).some((node) => node.bind !== undefined);
  if (!instance.partOverrides && !bound) {
    return visibleParts(composite);
  }
  return visibleParts({
    ...composite,
    nodes: Object.fromEntries(
      Object.values(composite.nodes).map((node) => {
        const overridden = overriddenNode(instance, node);
        return [node.id, boundNode(instance, overridden, parts(overridden))];
      }),
    ),
  });
};

const boundsCentre = ({ x, y, width, height }: Bounds): Point => ({ x: x + width / 2, y: y + height / 2 });

/** The box a link's free ends span; none when both of its ends are on nodes, which move with the nodes. */
const linkBounds = (link: Link): Bounds | undefined => {
  const points = [link.source, link.target].flatMap((end) => (isPointEndpoint(end) ? [end.point] : []));
  const [first, second] = points;
  return first ? pointBounds(first, second ?? first) : undefined;
};

/**
 * Every part of `composite` placed in the frame `to`, by its own constraint. None when no part constrains an axis:
 * there the uniform fit still applies and an instance draws its parts through one transform, which scales their text
 * with them — a picture rather than a resized card. Constraining any part opts the whole composite into the solve.
 */
export const placeParts = (
  composite: RenderList2D,
  from: Bounds,
  to: Bounds,
  fit?: InstanceFit,
): RenderList2D | undefined => {
  const elements = [...Object.values(composite.nodes), ...Object.values(composite.links)];
  if (!hasConstraints(elements)) {
    return undefined;
  }
  const solve = (bounds: Bounds, constrain: PartLayout | undefined) => solvePartBounds(bounds, { from, to }, constrain);
  const nodes = Object.values(composite.nodes).map((node): Node => {
    const solved = solve(nodeBounds(node), node.constrain);
    return { ...node, center: boundsCentre(solved), size: { width: solved.width, height: solved.height } };
  });
  const links = Object.values(composite.links).map((link): Link => {
    const box = linkBounds(link);
    if (!box) {
      return link;
    }
    const solved = solve(box, link.constrain);
    const move = (end: Endpoint): Endpoint =>
      isPointEndpoint(end) ? { point: mapPoint(end.point, box, solved) } : end;
    return {
      ...link,
      source: move(link.source),
      target: move(link.target),
      ...(link.points ? { points: link.points.map((point) => mapPoint(point, box, solved)) } : {}),
    };
  });
  return {
    ...composite,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: Object.fromEntries(links.map((link) => [link.id, link])),
  };
};

/** How an instance draws its composite: the parts it draws, and how their coordinates reach the scene. */
export type InstancePlacement = {
  /** The composite with this instance's part overrides, and its parts solved into the scene when any of them is constrained. */
  readonly view: RenderList2D;
  /** The transform from the view's coordinates to the scene's; the identity once the parts are already placed. */
  readonly transform: InstanceTransform;
};

/** What `instance` draws for `composite`: its part overrides, then its constraints ({@link placeParts}). */
export const instancePlacement = (
  instance: PlacedComposite,
  composite: RenderList2D,
  parts?: (node: Node) => readonly PartField[],
): InstancePlacement => {
  const view = instanceView(instance, composite, parts);
  const to = nodeBounds(instance);
  // Measured against the definition's box, not this instance's overridden copy of it: an override moves one part, it
  // does not move the frame every other part is placed against, which would make one instance's edit shift them all.
  const from = nodeFrame(instance) ?? compositeBounds(composite);
  const transform = instanceTransform(to, from, instance.fit);
  const placed = from && placeParts(view, from, to, instance.fit);
  return placed ? { view: placed, transform: { scale: 1, offset: { x: 0, y: 0 } } } : { view, transform };
};

/** Whether a transform leaves its coordinates where they are, which a constrained composite's always does. */
const isIdentity = ({ scale, offset }: InstanceTransform): boolean => scale === 1 && offset.x === 0 && offset.y === 0;

/**
 * The composite's parts as the instance draws them, in the scene's own coordinates: a constrained composite is solved
 * there already, and any other is mapped through the instance's transform. What editing an Object in place, and what
 * ungrouping one, both work on.
 */
export const drawnParts = (
  instance: PlacedComposite,
  composite: RenderList2D,
  parts?: (node: Node) => readonly PartField[],
): RenderList2D => {
  const { view, transform } = instancePlacement(instance, composite, parts);
  if (isIdentity(transform)) {
    return view;
  }
  const map = (point: Point) => toInstance(transform, point);
  const mapEnd = (end: Endpoint): Endpoint => (isPointEndpoint(end) ? { point: map(end.point) } : end);
  return {
    ...view,
    nodes: Object.fromEntries(
      Object.values(view.nodes).map((node) => [
        node.id,
        {
          ...node,
          center: map(node.center),
          size: { width: node.size.width * transform.scale, height: node.size.height * transform.scale },
        },
      ]),
    ),
    links: Object.fromEntries(
      Object.values(view.links).map((link) => [
        link.id,
        {
          ...link,
          source: mapEnd(link.source),
          target: mapEnd(link.target),
          ...(link.points ? { points: link.points.map(map) } : {}),
        },
      ]),
    ),
  };
};

/** The side of `frame` that a ray from its centre through `point` leaves by, and how far along it (0 to 1). */
const sideToward = (frame: Bounds, point: Point): { side: Side; offset: number } => {
  const halfWidth = frame.width / 2 || 1;
  const halfHeight = frame.height / 2 || 1;
  const dx = (point.x - (frame.x + halfWidth)) / halfWidth;
  const dy = (point.y - (frame.y + halfHeight)) / halfHeight;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return Math.abs(dx) >= Math.abs(dy)
    ? { side: dx >= 0 ? 'right' : 'left', offset: clamp((point.y - frame.y) / (frame.height || 1)) }
    : { side: dy >= 0 ? 'bottom' : 'top', offset: clamp((point.x - frame.x) / (frame.width || 1)) };
};

/**
 * An instance's ports: one per exposed node of its composite, named by that node's id, on the side of the instance
 * that faces where the node is drawn.
 */
export const instancePorts = (frame: Bounds, composite: RenderList2D, fit?: InstanceFit): Port[] => {
  const content = compositeBounds(composite);
  const placed = content && placeParts(composite, content, frame, fit);
  // A solved part is already in the scene's coordinates; an unconstrained one is still in the composite's.
  const transform = placed ? undefined : instanceTransform(frame, content, fit);
  return Object.values((placed ?? composite).nodes)
    .filter((node) => node.exposed)
    .map((node) => {
      const { side, offset } = sideToward(frame, transform ? toInstance(transform, node.center) : node.center);
      return sidePort(node.id, side, offset);
    });
};

/**
 * How the 2D editor places a group of a selection: the instance that takes the selection's place over its bounds,
 * and the members as the group's own list holds them. The model's `group` intent makes the group; this is only where
 * it stands and how its members follow its frame.
 */
export type GroupPlacement = {
  /** The instance, less its id and the composite it draws, which the group names. */
  instance: Omit<PlacedComposite, 'id' | 'composite'>;
  /** The selected nodes, about the centre of their bounds, laid out to follow the frame. */
  nodes: Node[];
  /** The links wholly inside the selection, moved with them. */
  links: Link[];
  /** The layers the members are on, which the group's list declares. */
  layers: NonNullable<RenderList2D['layers']>;
};

/**
 * Where a group of the selected nodes stands: they and the links wholly inside the selection are re-centred on their
 * bounds, and one instance takes their place. A link crossing the selection's edge ends on a port of the instance that
 * the inner node it left exposes. None when no node is selected, or a selected node is locked or a View.
 */
export const groupPlacement = (
  scene: RenderList2D,
  ids: Iterable<string>,
  { layer }: { layer?: LayerId } = {},
): GroupPlacement | undefined => {
  const selected = new Set(ids);
  const nodes = Object.values(scene.nodes).filter((node) => selected.has(node.id));
  const bounds = unionBounds(nodes.map(nodeBounds));
  // A View moved into an Object would be repeated at every placement (SPEC.mdl F-9.9).
  if (nodes.length === 0 || !bounds || nodes.some((node) => node.locked || isViewNode(node))) {
    return undefined;
  }
  const inside = new Set(nodes.map((node) => node.id));
  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const shift = { x: -centre.x, y: -centre.y };
  const isInside = (end: Endpoint) => {
    const node = endpointNode(end);
    return node === undefined || inside.has(node);
  };
  const touches = (link: Link) => [link.source, link.target].some((end) => inside.has(endpointNode(end) ?? ''));
  const links = Object.values(scene.links).filter(touches);
  const moved = links.filter((link) => isInside(link.source) && isInside(link.target));
  const crossing = links.filter((link) => !moved.includes(link));
  // The inner node at each crossing link's inside end is exposed, so the instance offers a port for it.
  const exposed = new Set(
    crossing.flatMap((link) => [link.source, link.target].map(endpointNode).filter((id) => id && inside.has(id))),
  );
  const layers = viewLayers(scene);
  // The group stands exactly where the selection did and resizes as it would have: one shape becomes a group of
  // itself, its part following the frame on both axes, so nothing is drawn around it and its handles are its own.
  // Several shapes keep their proportions of the frame (`scale`), which fills it rather than letterboxing them in it.
  const constrain: PartLayout = nodes.length === 1 ? { x: 'stretch', y: 'stretch' } : { x: 'scale', y: 'scale' };
  const placed = <T extends Node | Link>(element: T): T => ({
    ...element,
    constrain,
    layer: elementLayer(element, layers),
  });
  const shiftPoint = (point: Point): Point => ({ x: point.x + shift.x, y: point.y + shift.y });
  const shiftEnd = (end: Endpoint): Endpoint => ('point' in end ? { point: shiftPoint(end.point) } : end);
  const childNodes = nodes.map((node) =>
    placed({ ...node, center: shiftPoint(node.center), ...(exposed.has(node.id) ? { exposed: true } : {}) }),
  );
  const childLinks = moved.map((link) =>
    placed({
      ...link,
      source: shiftEnd(link.source),
      target: shiftEnd(link.target),
      ...(link.points ? { points: link.points.map(shiftPoint) } : {}),
    }),
  );
  const used = new Set([...childNodes, ...childLinks].map((element) => element.layer));
  const composite: RenderList2D = {
    id: '',
    nodes: Object.fromEntries(childNodes.map((node) => [node.id, node])),
    links: Object.fromEntries(childLinks.map((link) => [link.id, link])),
  };
  return {
    instance: {
      kind: 'instance',
      z: topZ(Object.values(scene.nodes)),
      center: centre,
      size: { width: bounds.width, height: bounds.height },
      // The frame is the selection's own box and the parts fill it, so the group draws where the shapes drew and no
      // second rectangle appears around them.
      fit: 'none',
      ports: instancePorts(bounds, composite),
      ...(layer !== undefined ? { layer } : {}),
    },
    nodes: childNodes,
    links: childLinks,
    layers: Object.fromEntries(layers.filter((entry) => used.has(entry.id)).map((entry) => [entry.id, entry])),
  };
};

/**
 * The parts of an instance as it draws them, for the model's `ungroup` to put back: the composite's nodes and links
 * with the instance's part overrides, placed and sized as the instance places them (constraints and all, so ungrouping
 * leaves the picture where it was), on the instance's layer and over what the scene already holds.
 */
export const ungroupPlacement = (
  scene: RenderList2D,
  instance: PlacedComposite,
  composite: RenderList2D,
): { nodes: Node[]; links: Link[] } => {
  const { view, transform } = instancePlacement(instance, composite);
  const map = (point: Point) => toInstance(transform, point);
  const mapEnd = (end: Endpoint): Endpoint => ('point' in end ? { point: map(end.point) } : end);
  let z = topZ(Object.values(scene.nodes));
  const nodes: Node[] = Object.values(view.nodes).map((node) => {
    const { exposed: _, constrain: __, ...rest } = node;
    z = topZ([{ id: '', z }]);
    return {
      ...rest,
      z,
      center: map(node.center),
      size: { width: node.size.width * transform.scale, height: node.size.height * transform.scale },
      ...(instance.layer !== undefined ? { layer: instance.layer } : {}),
    };
  });
  const links: Link[] = Object.values(view.links).map((source) => {
    const { constrain: _, ...rest } = source;
    return {
      ...rest,
      source: mapEnd(source.source),
      target: mapEnd(source.target),
      ...(source.points ? { points: source.points.map(map) } : {}),
      ...(instance.layer !== undefined ? { layer: instance.layer } : {}),
    };
  });
  return { nodes, links };
};

const isPointValue = (value: unknown): value is Point =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'x') === 'number' &&
  typeof Reflect.get(value, 'y') === 'number';

const isSizeValue = (value: unknown): value is { width: number; height: number } =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'width') === 'number' &&
  typeof Reflect.get(value, 'height') === 'number';

/**
 * A copy of `composite` under `compositeId` with fresh node and link ids (a drawing keys nodes by id across scenes), and
 * the renaming it used, for the instances that move onto the copy (`retargetInstance`).
 */
export const copyComposite = (
  composite: RenderList2D,
  compositeId: ViewId,
  createId: (prefix: string) => string,
): { composite: RenderList2D; rename: (id: NodeId) => NodeId } => {
  const ids = new Map(Object.keys(composite.nodes).map((id) => [id, createId('node')]));
  const rename = (id: NodeId) => ids.get(id) ?? id;
  const renameEnd = (end: Endpoint): Endpoint => ('node' in end ? { ...end, node: rename(end.node) } : end);
  return {
    rename,
    composite: {
      ...promoted(composite),
      id: compositeId,
      name: `${composite.name ?? 'Object'} copy`,
      nodes: Object.fromEntries(
        Object.values(composite.nodes).map((node) => [rename(node.id), { ...node, id: rename(node.id) }]),
      ),
      links: Object.fromEntries(
        Object.values(composite.links).map((link) => {
          const id = createId('link');
          return [id, { ...link, id, source: renameEnd(link.source), target: renameEnd(link.target) }];
        }),
      ),
    },
  };
};

/** The instance pointed at the composite copy `compositeId`, its part overrides and ports renamed as the copy's nodes were. */
export const retargetInstance = (
  instance: PlacedComposite,
  compositeId: ViewId,
  rename: (id: NodeId) => NodeId,
): PlacedComposite => ({
  ...instance,
  composite: compositeId,
  ...(instance.partOverrides
    ? {
        partOverrides: Object.fromEntries(
          Object.entries(instance.partOverrides).map(([id, value]) => [rename(id), value]),
        ),
      }
    : {}),
  ...(instance.ports ? { ports: instance.ports.map((port) => ({ ...port, id: rename(port.id) })) } : {}),
});

/** The links in `scene` attached to an instance's ports, renamed after `copyComposite` renamed the ports. */
export const renamePortLinks = (scene: RenderList2D, before: PlacedComposite, after: PlacedComposite): SceneEdit[] => {
  const names = new Map((before.ports ?? []).map((port, index) => [port.id, after.ports?.[index]?.id ?? port.id]));
  const rename = (end: Endpoint): Endpoint =>
    'node' in end && end.node === before.id && end.port ? { ...end, port: names.get(end.port) ?? end.port } : end;
  return Object.values(scene.links)
    .filter((link) => endpointNode(link.source) === before.id || endpointNode(link.target) === before.id)
    .map((link) => updateElement(link.id, { source: rename(link.source), target: rename(link.target) }));
};
