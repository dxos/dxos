//
// Copyright 2026 DXOS.org
//

//
// Composite objects (ANIMATION.md §4): a composite is a scene marked `kind: 'composite'`; an instance node draws it at
// its own place and size. Grouping a selection as an object, ungrouping an instance and making one unique are pure
// functions here that return the scenes and intents the view applies, so each is one undoable step.
//

import {
  type Bounds,
  type Endpoint,
  type InstanceFit,
  type InstanceNode,
  type Intent,
  type LayerId,
  type Link,
  type Node,
  type NodeId,
  type Point,
  type Port,
  type Side,
  type View,
  type ViewId,
  type ViewMap,
  endpointNode,
  isInstanceNode,
  isViewNode,
  pruneOrphaned,
} from '../model/index.ts';
import { unionBounds } from './hit.ts';
import { elementLayer, viewLayers } from './layers.ts';
import { topZ } from './order.ts';
import { nodeBounds } from './shapes.ts';

/** Whether a scene is a composite's definition. */
export const isComposite = (scene: View | undefined): boolean => scene?.kind === 'composite';

/** The composites of a drawing, by name. */
export const compositeViews = (scenes: ViewMap): View[] =>
  Object.values(scenes)
    .filter(isComposite)
    .sort((left, right) => (left.name ?? left.id).localeCompare(right.name ?? right.id));

/** Whether a scene is an anonymous Object: one the Group command made, not yet named or placed again. */
export const isAnonymous = (scene: View | undefined): boolean => isComposite(scene) && scene?.anonymous === true;

/** The Objects library: the composites by name, without the anonymous ones (VIEWS.md §4.4). */
export const libraryViews = (scenes: ViewMap): View[] => compositeViews(scenes).filter((scene) => !isAnonymous(scene));

/** `scene` named or placed again, so it joins the library; the same scene when it was not anonymous. */
export const promoted = (scene: View): View => {
  if (scene.anonymous === undefined) {
    return scene;
  }
  const { anonymous: _, ...rest } = scene;
  return rest;
};

/**
 * The anonymous Objects that `nodes` place again, promoted (VIEWS.md §4.4): what a paste or a duplicate writes into
 * the store with its intent. Empty when none of them is an Instance of an anonymous Object in `scenes`.
 */
export const promotedBy = (scenes: ViewMap, nodes: Iterable<Node>): Record<ViewId, View> => {
  const result: Record<ViewId, View> = {};
  for (const node of nodes) {
    const definition = isInstanceNode(node) ? scenes[node.composite] : undefined;
    if (definition && isAnonymous(definition)) {
      result[definition.id] = promoted(definition);
    }
  }
  return result;
};

/** How many instances of each composite the drawing holds, in any scene. */
export const instanceCounts = (scenes: ViewMap): Record<ViewId, number> => {
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
  views: ViewMap,
  composite: ViewId,
  { instances, roots }: { instances: boolean; roots: readonly ViewId[] },
): ViewMap | undefined => {
  if (!instances && (instanceCounts(views)[composite] ?? 0) > 0) {
    return undefined;
  }
  const { [composite]: _, ...rest } = views;
  const next = Object.fromEntries(
    Object.entries(rest).map(([id, view]): [ViewId, View] => {
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
export const compositeBounds = (composite: View): Bounds | undefined =>
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

/** The composite's node with this instance's overrides of it, shallow per field (`style` merges per key). */
export const overriddenNode = (instance: InstanceNode, node: Node): Node => {
  const override = instance.overrides?.[node.id];
  if (!override) {
    return node;
  }
  const style = Reflect.get(override, 'style');
  return {
    ...node,
    ...override,
    id: node.id,
    type: node.type,
    ...(typeof style === 'object' && style !== null ? { style: { ...node.style, ...style } } : {}),
  };
};

/** The composite with an instance's overrides applied to its nodes, as the instance draws it. */
export const instanceView = (instance: InstanceNode, composite: View): View =>
  instance.overrides
    ? {
        ...composite,
        nodes: Object.fromEntries(
          Object.values(composite.nodes).map((node) => [node.id, overriddenNode(instance, node)]),
        ),
      }
    : composite;

/** The side of `frame` that a ray from its centre through `point` leaves by, and how far along it (0 to 1). */
const sideToward = (frame: Bounds, point: Point): { side: Side; offset: number } => {
  const halfWidth = frame.width / 2 || 1;
  const halfHeight = frame.height / 2 || 1;
  const dx = (point.x - (frame.x + halfWidth)) / halfWidth;
  const dy = (point.y - (frame.y + halfHeight)) / halfHeight;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return Math.abs(dx) >= Math.abs(dy)
    ? { side: dx >= 0 ? 'e' : 'w', offset: clamp((point.y - frame.y) / (frame.height || 1)) }
    : { side: dy >= 0 ? 's' : 'n', offset: clamp((point.x - frame.x) / (frame.width || 1)) };
};

/**
 * An instance's ports: one per exposed node of its composite, named by that node's id, on the side of the instance
 * that faces where the node is drawn.
 */
export const instancePorts = (frame: Bounds, composite: View, fit?: InstanceFit): Port[] => {
  const transform = instanceTransform(frame, compositeBounds(composite), fit);
  return Object.values(composite.nodes)
    .filter((node) => node.exposed)
    .map((node) => ({ id: node.id, ...sideToward(frame, toInstance(transform, node.center)) }));
};

export type ComposeOptions = {
  /** The new composite scene's id. */
  compositeId: ViewId;
  /** The instance node that replaces the selection. */
  instanceId: NodeId;
  name?: string;
  /** The layer the instance goes on. */
  layer?: LayerId;
  /** Marks the composite anonymous, as the Group command makes it. */
  anonymous?: boolean;
};

/** What grouping a selection as an object makes: the composite, and the intents that put an instance in its place. */
export type Composition = { composite: View; intents: Intent[] };

/**
 * Groups the selected nodes as an object (`compose`): they and the links wholly inside the selection move into a new
 * composite scene, re-centred on their bounds, and one instance replaces them in place. A link crossing the selection's
 * edge stays, re-attached to a port of the instance that the inner node it left now exposes. Keyed tracks of the
 * moved nodes move with them. None when no node is selected or a selected node is locked.
 */
export const composeSelection = (
  scene: View,
  ids: Iterable<string>,
  { compositeId, instanceId, name, layer, anonymous }: ComposeOptions,
): Composition | undefined => {
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
  const placed = <T extends Node | Link>(element: T): T => ({ ...element, layer: elementLayer(element, layers) });
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
      ...(link.type === 'spline' ? { points: link.points.map(shiftPoint) } : {}),
    }),
  );
  const used = new Set([...childNodes, ...childLinks].map((element) => element.layer));
  const composite: View = {
    id: compositeId,
    name: name ?? 'Object',
    kind: 'composite',
    ...(anonymous ? { anonymous: true } : {}),
    nodes: Object.fromEntries(childNodes.map((node) => [node.id, node])),
    links: Object.fromEntries(childLinks.map((link) => [link.id, link])),
    layers: Object.fromEntries(layers.filter((entry) => used.has(entry.id)).map((entry) => [entry.id, entry])),
  };
  const instance: InstanceNode = {
    type: 'instance',
    id: instanceId,
    z: topZ(Object.values(scene.nodes)),
    center: centre,
    size: { width: bounds.width, height: bounds.height },
    composite: compositeId,
    ports: instancePorts(bounds, composite),
    ...(layer !== undefined ? { layer } : {}),
  };
  const reattach = (end: Endpoint): Endpoint => {
    const node = endpointNode(end);
    return node !== undefined && inside.has(node) ? { node: instanceId, port: node } : end;
  };
  return {
    composite,
    intents: [
      { kind: 'create', node: instance },
      // Re-attached before the nodes go, since deleting a node takes the links on it.
      ...crossing.map((link): Intent => ({
        kind: 'update',
        id: link.id,
        values: { source: reattach(link.source), target: reattach(link.target) },
      })),
      { kind: 'delete', ids: [...inside] },
    ],
  };
};

/**
 * Ungroups an instance: the composite's nodes and links, with the instance's overrides, are placed where the instance
 * draws them under fresh ids (`createId`), and links on the instance's ports re-attach to the nodes behind them. The
 * definition is left as it is, for any other instance.
 */
export const ungroupInstance = (
  scene: View,
  instance: InstanceNode,
  composite: View,
  createId: (prefix: string) => string,
): Intent[] => {
  const transform = instanceTransform(nodeBounds(instance), compositeBounds(composite), instance.fit);
  const ids = new Map(Object.keys(composite.nodes).map((id) => [id, createId('node')]));
  const map = (point: Point) => toInstance(transform, point);
  const mapEnd = (end: Endpoint): Endpoint =>
    'point' in end ? { point: map(end.point) } : { ...end, node: ids.get(end.node) ?? end.node };
  let z = topZ(Object.values(scene.nodes));
  const created: Intent[] = Object.values(composite.nodes).map((source) => {
    const node = overriddenNode(instance, source);
    const { exposed: _, ...rest } = node;
    z = topZ([{ id: '', z }]);
    return {
      kind: 'create',
      node: {
        ...rest,
        id: ids.get(node.id) ?? node.id,
        z,
        center: map(node.center),
        size: { width: node.size.width * transform.scale, height: node.size.height * transform.scale },
        ...(instance.layer !== undefined ? { layer: instance.layer } : {}),
      },
    };
  });
  const linked: Intent[] = Object.values(composite.links).map((source) => ({
    kind: 'link',
    link: {
      ...source,
      id: createId('link'),
      source: mapEnd(source.source),
      target: mapEnd(source.target),
      ...(source.type === 'spline' ? { points: source.points.map(map) } : {}),
      ...(instance.layer !== undefined ? { layer: instance.layer } : {}),
    },
  }));
  const onInstance = (end: Endpoint): Endpoint =>
    'node' in end && end.node === instance.id
      ? { node: (end.port && ids.get(end.port)) ?? ids.values().next().value ?? end.node }
      : end;
  const reattached: Intent[] = Object.values(scene.links)
    .filter((link) => endpointNode(link.source) === instance.id || endpointNode(link.target) === instance.id)
    .map((link) => ({
      kind: 'update',
      id: link.id,
      values: { source: onInstance(link.source), target: onInstance(link.target) },
    }));
  return [...created, ...linked, ...reattached, { kind: 'delete', ids: [instance.id] }];
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
  composite: View,
  compositeId: ViewId,
  createId: (prefix: string) => string,
): { composite: View; rename: (id: NodeId) => NodeId } => {
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

/** The instance pointed at the composite copy `compositeId`, its overrides and ports renamed as the copy's nodes were. */
export const retargetInstance = (
  instance: InstanceNode,
  compositeId: ViewId,
  rename: (id: NodeId) => NodeId,
): InstanceNode => ({
  ...instance,
  composite: compositeId,
  ...(instance.overrides
    ? { overrides: Object.fromEntries(Object.entries(instance.overrides).map(([id, value]) => [rename(id), value])) }
    : {}),
  ...(instance.ports ? { ports: instance.ports.map((port) => ({ ...port, id: rename(port.id) })) } : {}),
});

/** The links in `scene` attached to an instance's ports, renamed after `copyComposite` renamed the ports. */
export const renamePortLinks = (scene: View, before: InstanceNode, after: InstanceNode): Intent[] => {
  const names = new Map((before.ports ?? []).map((port, index) => [port.id, after.ports?.[index]?.id ?? port.id]));
  const rename = (end: Endpoint): Endpoint =>
    'node' in end && end.node === before.id && end.port ? { ...end, port: names.get(end.port) ?? end.port } : end;
  return Object.values(scene.links)
    .filter((link) => endpointNode(link.source) === before.id || endpointNode(link.target) === before.id)
    .map((link) => ({
      kind: 'update',
      id: link.id,
      values: { source: rename(link.source), target: rename(link.target) },
    }));
};
