//
// Copyright 2026 DXOS.org
//

import {
  type BuiltinNodeType,
  DEFAULT_LAYER,
  type Endpoint,
  type Link,
  type LinkType,
  type MemoryViewStore,
  type Node,
  type NodeStyle,
  type StyleHue,
  type View,
  type ViewId,
  createMemoryStore,
  createNode,
  initialKeys,
} from '@dxos/react-ui-canvas';
import { type Resolved2D, type Scene, resolveLayout2D, rootScene, sceneLayout } from '@dxos/scene';

/** The scene kinds the 2D renderer draws as react-ui-canvas nodes of the same name. */
const NODE_TYPES: Readonly<Record<string, BuiltinNodeType>> = {
  rect: 'rect',
  ellipse: 'ellipse',
  polygon: 'polygon',
  note: 'note',
};

const MARKERS = ['arrow', 'circle', 'triangle'] as const;

/** Scene style tokens as react-ui-canvas's: a surface of `none` is unfilled, any other surface is filled. */
const nodeStyle = (style: Scene.Style | undefined): NodeStyle | undefined => {
  if (!style) {
    return undefined;
  }
  const { hue, tone, opacity, rounded, border, surface } = style;
  return {
    ...(hue !== undefined ? { hue } : {}),
    ...(tone !== undefined ? { tone } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rounded !== undefined ? { rounded } : {}),
    ...(border !== undefined ? { border } : {}),
    ...(surface !== undefined ? { fill: surface !== 'none' } : {}),
  };
};

/** A composite element (its object has parts) is a `view` node over its parts layout's View. */
const toNode = (element: Resolved2D, z: string): Node | undefined => {
  const type = element.parts !== undefined ? 'view' : NODE_TYPES[element.kind];
  if (!type || !element.center) {
    return undefined;
  }
  const style = nodeStyle(element.style);
  return {
    ...createNode({ type, id: element.id, z, center: element.center, size: element.size, scene: element.parts }),
    layer: DEFAULT_LAYER.id,
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(element.rotation !== undefined ? { rotation: element.rotation } : {}),
    ...(style ? { style } : {}),
  };
};

const endpoint = ({ element, anchor }: Scene.Binding) =>
  anchor === undefined ? { node: element } : { node: element, port: anchor };

/** A link both of whose ends are in the scene; a link to a missing element is not drawn (Review Focus 1). */
const toLink = (element: Resolved2D, z: string, nodes: Readonly<Record<string, Node>>): Link | undefined => {
  const { from, to } = element;
  if (element.kind !== 'link' || !from || !to || !nodes[from.element] || !nodes[to.element]) {
    return undefined;
  }
  const end = MARKERS.find((marker) => marker === element.props?.end);
  return {
    type: 'line',
    id: element.id,
    z,
    layer: DEFAULT_LAYER.id,
    source: endpoint(from),
    target: endpoint(to),
    ...(end ? { ends: { end } } : {}),
    ...(element.label !== undefined ? { text: element.label } : {}),
    ...(element.style?.hue !== undefined ? { style: { hue: element.style.hue } } : {}),
  };
};

//
// Canvas Views written as layouts: every field the scene model has no slot for is kept under `props.canvas`, so a
// View read back from its layout is the View that was written.
//

type Fields = Record<string, unknown>;

/** The node and link style fields a scene `Style` carries; the rest stay in `props.canvas.style`. */
const SCENE_STYLE_KEYS = ['hue', 'tone', 'opacity', 'rounded', 'border', 'fill'] as const;

const isRecord = (value: unknown): value is Fields => typeof value === 'object' && value !== null;

const pick = (fields: Fields, keys: readonly string[]): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => keys.includes(key)));

const omit = (fields: Fields, keys: readonly string[]): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)));

const nonEmpty = (fields: Fields): Fields | undefined => (Object.keys(fields).length > 0 ? fields : undefined);

/** A canvas style's scene fields as scene tokens: `fill: false` is the `none` surface, `fill: true` a solid one. */
const sceneStyle = (style: Fields): Scene.Style | undefined => {
  const { fill, ...rest } = pick(style, SCENE_STYLE_KEYS);
  const tokens: Scene.Style = {
    ...rest,
    ...(fill === undefined ? {} : { surface: fill === false ? 'none' : 'solid' }),
  };
  return Object.keys(tokens).length > 0 ? tokens : undefined;
};

const VIEW_PREFIX = 'view:';
const INSTANCE_PREFIX = 'instance:';

/** The fields a node keeps in its element's own slots. */
const NODE_SLOTS = ['type', 'id', 'z', 'center', 'size', 'rotation', 'label', 'layer', 'locked', 'style'];
const LINK_SLOTS = ['id', 'z', 'source', 'target', 'text', 'layer', 'locked', 'style'];

const toBinding = (end: Endpoint): Scene.Binding | undefined =>
  'node' in end
    ? end.port === undefined
      ? { element: end.node }
      : { element: end.node, anchor: end.port }
    : undefined;

const canvasExtra = (fields: Fields, slots: readonly string[], style: unknown): Fields => {
  const rest = isRecord(style) ? nonEmpty(omit(style, SCENE_STYLE_KEYS)) : undefined;
  return { ...omit(fields, slots), ...(rest ? { style: rest } : {}) };
};

const nodeElement = (node: Node, objects: Map<string, Scene.Object2D>): Scene.Element2D => {
  const fields: Fields = { ...node };
  const style = isRecord(node.style) ? sceneStyle(node.style) : undefined;
  const extra = canvasExtra(fields, NODE_SLOTS, node.style);
  let placed: { object: string } | { kind: string };
  if (node.type === 'view' && typeof fields.scene === 'string') {
    const object = { id: `${VIEW_PREFIX}${fields.scene}`, kind: 'rect', parts: fields.scene };
    objects.set(object.id, object);
    placed = { object: object.id };
    delete extra.scene;
  } else if (node.type === 'instance' && typeof fields.composite === 'string') {
    const object = { id: `${INSTANCE_PREFIX}${fields.composite}`, kind: 'rect', parts: fields.composite };
    objects.set(object.id, object);
    placed = { object: object.id };
    delete extra.composite;
    extra.type = 'instance';
  } else {
    placed = { kind: node.type };
  }
  return {
    id: node.id,
    ...placed,
    order: node.z,
    center: node.center,
    size: node.size,
    ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
    ...(typeof fields.label === 'string' ? { label: fields.label } : {}),
    ...(node.layer !== undefined ? { layer: node.layer } : {}),
    ...(node.locked !== undefined ? { locked: node.locked } : {}),
    ...(style ? { style } : {}),
    props: { canvas: extra },
  };
};

const linkElement = (link: Link): Scene.Element2D => {
  const from = toBinding(link.source);
  const to = toBinding(link.target);
  const extra = canvasExtra({ ...link }, LINK_SLOTS, link.style);
  // A point end has no element to bind, so the endpoint itself is kept.
  if (!from) {
    extra.source = link.source;
  }
  if (!to) {
    extra.target = link.target;
  }
  const hue = link.style?.hue;
  return {
    id: link.id,
    kind: 'link',
    order: link.z,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(link.text !== undefined ? { label: link.text } : {}),
    ...(link.layer !== undefined ? { layer: link.layer } : {}),
    ...(link.locked !== undefined ? { locked: link.locked } : {}),
    ...(hue !== undefined ? { style: { hue } } : {}),
    props: { canvas: extra },
  };
};

/**
 * A react-ui-canvas View as a 2D layout and the objects its portals and instances place: a `view` node places the
 * composite object `view:<scene>`, an `instance` node the object `instance:<composite>`, each with the inner View as
 * its parts. {@link toCanvasView} reads the View back unchanged.
 */
export const fromCanvasView = (view: View): { layout: Scene.LayoutRecord2D; objects: Scene.Object2D[] } => {
  const objects = new Map<string, Scene.Object2D>();
  const elements: Record<string, Scene.Element2D> = {};
  for (const node of Object.values(view.nodes)) {
    elements[node.id] = nodeElement(node, objects);
  }
  for (const link of Object.values(view.links)) {
    elements[link.id] = linkElement(link);
  }
  const canvas = nonEmpty(pick({ ...view }, ['layers', 'kind', 'anonymous']));
  return {
    layout: {
      id: view.id,
      dim: '2d',
      ...(view.name !== undefined ? { name: view.name } : {}),
      elements,
      ...(canvas ? { props: { canvas } } : {}),
    },
    objects: [...objects.values()],
  };
};

/** Scene style tokens back onto the canvas style fields they came from. */
const canvasStyle = (style: Scene.Style | undefined, extra: unknown): Fields | undefined => {
  const merged: Fields = { ...(isRecord(extra) ? extra : {}), ...nodeStyle(style) };
  return nonEmpty(merged);
};

/** An element written by {@link fromCanvasView} as the node it was. */
const canvasNode = (element: Resolved2D, canvas: Fields): Node | undefined => {
  if (!element.center || !element.size || element.order === undefined) {
    return undefined;
  }
  const { style: extraStyle, type: storedType, ...extra } = canvas;
  const type = element.parts === undefined ? element.kind : storedType === 'instance' ? 'instance' : 'view';
  const style = canvasStyle(element.style, extraStyle);
  return {
    ...extra,
    type,
    id: element.id,
    z: element.order,
    center: element.center,
    size: element.size,
    ...(element.rotation !== undefined ? { rotation: element.rotation } : {}),
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(element.layer !== undefined ? { layer: element.layer } : {}),
    ...(element.locked !== undefined ? { locked: element.locked } : {}),
    ...(style ? { style } : {}),
    ...(element.parts === undefined
      ? {}
      : type === 'instance'
        ? { composite: element.parts }
        : { scene: element.parts }),
  };
};

const toEndpoint = (binding: Scene.Binding | undefined, stored: unknown): Endpoint | undefined =>
  binding
    ? binding.anchor === undefined
      ? { node: binding.element }
      : { node: binding.element, port: binding.anchor }
    : isRecord(stored) &&
        isRecord(stored.point) &&
        typeof stored.point.x === 'number' &&
        typeof stored.point.y === 'number'
      ? { point: { x: stored.point.x, y: stored.point.y } }
      : undefined;

const LINK_TYPES_BY_NAME: Readonly<Record<string, LinkType>> = {
  line: 'line',
  curve: 'curve',
  spline: 'spline',
  smart: 'smart',
};

const isStyleHue = (hue: string | undefined): hue is StyleHue => hue !== undefined;

/** A link element written by {@link fromCanvasView} as the link it was. */
const canvasLink = (element: Resolved2D, canvas: Fields): Link | undefined => {
  const { style: extraStyle, type: storedType, source, target, points, ...extra } = canvas;
  const sourceEnd = toEndpoint(element.from, source);
  const targetEnd = toEndpoint(element.to, target);
  if (!sourceEnd || !targetEnd || element.order === undefined) {
    return undefined;
  }
  const hue = element.style?.hue;
  const style = { ...(isRecord(extraStyle) ? extraStyle : {}), ...(isStyleHue(hue) ? { hue } : {}) };
  const base = {
    ...extra,
    id: element.id,
    z: element.order,
    source: sourceEnd,
    target: targetEnd,
    ...(element.label !== undefined ? { text: element.label } : {}),
    ...(element.layer !== undefined ? { layer: element.layer } : {}),
    ...(element.locked !== undefined ? { locked: element.locked } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };
  const type = typeof storedType === 'string' ? (LINK_TYPES_BY_NAME[storedType] ?? 'line') : 'line';
  return type === 'spline' ? { ...base, type, points: Array.isArray(points) ? points : [] } : { ...base, type };
};

/**
 * A 2D layout as a react-ui-canvas View. A layout {@link fromCanvasView} wrote reads back as the View it was; any
 * other (a `.dx` document's) is drawn with the default layer and the scene kinds react-ui-canvas has nodes for.
 */
export const toCanvasView = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): View => {
  const canvas = layout.props?.canvas;
  return isRecord(canvas) || Object.values(layout.elements).some((element) => isRecord(element.props?.canvas))
    ? storedView(doc, layout, isRecord(canvas) ? canvas : {})
    : toView(doc, layout);
};

const storedView = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D, canvas: Fields): View => {
  const nodes: Record<string, Node> = {};
  const links: Record<string, Link> = {};
  for (const element of Object.values(resolveLayout2D(doc, layout))) {
    const stored = element.props?.canvas;
    const fields = isRecord(stored) ? stored : {};
    if (element.kind === 'link') {
      const link = canvasLink(element, fields);
      link && (links[link.id] = link);
    } else {
      const node = canvasNode(element, fields);
      node && (nodes[node.id] = node);
    }
  }
  return {
    ...pick(canvas, ['layers', 'kind', 'anonymous']),
    id: layout.id,
    ...(layout.name !== undefined ? { name: layout.name } : {}),
    nodes,
    links,
  };
};

const toView = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): View => {
  const elements = Object.values(resolveLayout2D(doc, layout)).filter((element) => !element.hidden);
  const keys = initialKeys(elements.length);
  const nodes: Record<string, Node> = {};
  elements.forEach((element, index) => {
    const node = toNode(element, element.order ?? keys[index]);
    node && (nodes[node.id] = node);
  });
  const links: Record<string, Link> = {};
  elements.forEach((element, index) => {
    const link = toLink(element, element.order ?? keys[index], nodes);
    link && (links[link.id] = link);
  });
  return { id: layout.id, name: layout.name, nodes, links, layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER } };
};

/**
 * A document's 2D layouts as react-ui-canvas Views, one per layout, in a store the canvas reads; the scene's layout is
 * the root and comes first, and a composite element is a `view` node over its parts layout's View. 3D layouts are
 * left out.
 */
export const toCanvasViews = (
  doc: Scene.SceneDocument,
  scene: Scene.SceneRecord | undefined = rootScene(doc),
): { views: View[]; store: MemoryViewStore; root: ViewId } => {
  const rootLayout = sceneLayout(doc, scene)?.id;
  const views = doc.layouts
    .flatMap((layout) => (layout.dim === '2d' ? [toCanvasView(doc, layout)] : []))
    .sort((left, right) => Number(right.id === rootLayout) - Number(left.id === rootLayout));
  const root = views[0]?.id ?? '';
  return { views, store: createMemoryStore(views, {}, { root }), root };
};
