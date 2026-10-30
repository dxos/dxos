//
// Copyright 2026 DXOS.org
//

import {
  type Bounds,
  type BuiltinNodeType,
  type ElementEndpoint,
  type Endpoint,
  type Layer,
  type Link,
  type LinkType,
  type NamedStyle2D,
  type Node,
  type NodeStyle,
  type Resolved2D,
  type Scene,
  type Style2D,
  STYLE_HUES,
  type StyleHue,
  type StyleMap,
  type ViewId,
  findLayout,
  nodeFrame,
  resolveLayout2D,
  rootScene,
  sceneLayout,
} from '@dxos/scene';

import { DEFAULT_LAYER, createNode, initialKeys } from '../utils/index.ts';

/**
 * What the 2D engine draws for one layout (COMMON-CORE C.1): its elements resolved against the document's objects and
 * styles into the engine's node and link shapes, with the layout's layers. Derived from the layout on every change and
 * never stored or edited: the engine's edits reach the document as `LayoutIntent`s.
 */
export type RenderList2D = {
  readonly id: ViewId;
  readonly name?: string;
  readonly nodes: Readonly<Record<string, Node>>;
  readonly links: Readonly<Record<string, Link>>;
  readonly layers?: Readonly<Record<string, Layer>>;
  readonly kind?: Scene.LayoutKind;
  readonly anonymous?: boolean;
};

/** Every layout's render list, by layout id. */
export type RenderLists2D = Readonly<Record<ViewId, RenderList2D>>;

/** The scene kinds the 2D renderer draws as react-ui-canvas nodes of the same name. */
const NODE_TYPES: Readonly<Record<string, BuiltinNodeType>> = {
  rect: 'rect',
  ellipse: 'ellipse',
  polygon: 'polygon',
  note: 'note',
};

const MARKERS = ['arrow', 'circle', 'triangle'] as const;

/** A 2D style as react-ui-canvas's node style: the diagram-only values (sketchy, pattern, weight) have no node field. */
const nodeStyle = (style: Style2D | undefined): NodeStyle | undefined => {
  if (!style) {
    return undefined;
  }
  const { pattern: _pattern, weight: _weight, lineStyle, ...rest } = style;
  const result: NodeStyle = { ...rest, ...(lineStyle !== undefined && lineStyle !== 'sketchy' ? { lineStyle } : {}) };
  return Object.keys(result).length > 0 ? result : undefined;
};

/** A model's named styles as the canvas's style classes. */
export const styleClasses = (styles: Readonly<Record<string, NamedStyle2D>> | undefined): StyleMap =>
  Object.fromEntries(
    Object.entries(styles ?? {}).map(([id, { name, ...look }]) => {
      const style = nodeStyle(look);
      return [id, { id, name: name ?? id, ...(style ? { style } : {}) }];
    }),
  );

/** The canvas's style classes as a model's named styles. */
export const namedStyles = (classes: StyleMap): Record<string, NamedStyle2D> =>
  Object.fromEntries(Object.values(classes).map(({ id, name, style }) => [id, { name, ...style }]));

/** A placed composite's box and fixed region: its parts' bounds at its `scale` about its origin (decision 18). */
type ScaledFrame = { center: { x: number; y: number }; size: { width: number; height: number }; frame: Bounds };

/** Undefined for an element with no scale, or whose parts have nothing with a frame. */
const scaledFrame = (doc: Scene.SceneDocument, element: Resolved2D): ScaledFrame | undefined => {
  const parts = element.parts === undefined ? undefined : findLayout(doc, element.parts);
  if (!element.scale || !element.center || parts?.dim !== '2d') {
    return undefined;
  }
  const boxes = Object.values(resolveLayout2D(doc, parts)).flatMap(({ center, size }) =>
    center && size ? [{ x: center.x - size.width / 2, y: center.y - size.height / 2, ...size }] : [],
  );
  if (boxes.length === 0) {
    return undefined;
  }
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const width = Math.max(...boxes.map((box) => box.x + box.width)) - x;
  const height = Math.max(...boxes.map((box) => box.y + box.height)) - y;
  const { center, scale } = element;
  return {
    center: { x: center.x + scale.x * (x + width / 2), y: center.y + scale.y * (y + height / 2) },
    size: { width: width * scale.x, height: height * scale.y },
    frame: { x, y, width, height },
  };
};

/** A composite element (its object has parts) is a `view` node over its parts layout's render list. */
const toNode = (doc: Scene.SceneDocument, element: Resolved2D, z: string, layer: string): Node | undefined => {
  const type = element.parts !== undefined ? 'view' : NODE_TYPES[element.type];
  if (!type || !element.center) {
    return undefined;
  }
  const style = nodeStyle(element.overrides);
  const scaled = scaledFrame(doc, element);
  return {
    ...createNode({
      type,
      id: element.id,
      z,
      center: scaled?.center ?? element.center,
      size: scaled?.size ?? element.size,
      scene: element.parts,
    }),
    ...(scaled ? { frame: scaled.frame } : {}),
    layer,
    ...(element.style !== undefined ? { class: element.style } : {}),
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(element.rotation !== undefined ? { rotation: element.rotation } : {}),
    ...(style ? { style } : {}),
  };
};

/** A link naming no type routes at right angles around the shapes, which is what a generated diagram wants. */
const DEFAULT_LINK_TYPE = 'smart';

/** A scene endpoint as react-ui-canvas's: a node and port, or a free point. */
const endpoint = ({ node, port, point }: ElementEndpoint): Endpoint | undefined =>
  node !== undefined ? (port === undefined ? { node } : { node, port }) : point ? { point } : undefined;

/** A canvas endpoint as a scene one. */
const elementEndpoint = (end: Endpoint): ElementEndpoint =>
  'node' in end
    ? end.port === undefined
      ? { node: end.node }
      : { node: end.node, port: end.port }
    : { point: end.point };

/** A link both of whose ends are in the scene; a link to a missing element is not drawn (Review Focus 1). */
const toLink = (
  element: Resolved2D,
  z: string,
  layer: string,
  nodes: Readonly<Record<string, Node>>,
): Link | undefined => {
  const source = element.source && endpoint(element.source);
  const target = element.target && endpoint(element.target);
  const present = (end: Endpoint) => !('node' in end) || nodes[end.node] !== undefined;
  if (element.type !== 'link' || !source || !target || !present(source) || !present(target)) {
    return undefined;
  }
  const end = MARKERS.find((marker) => marker === element.props?.end);
  return {
    type: DEFAULT_LINK_TYPE,
    id: element.id,
    z,
    layer,
    ...(element.style !== undefined ? { class: element.style } : {}),
    source,
    target,
    ...(end ? { ends: { end } } : {}),
    ...(element.label !== undefined ? { text: element.label } : {}),
    ...(element.overrides?.hue !== undefined ? { style: { hue: element.overrides.hue } } : {}),
  };
};

//
// Render lists written as layouts: every field the scene model has no slot for is kept under `props.canvas`, so a
// render list read back from its layout is the one that was written.
//

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields => typeof value === 'object' && value !== null;

const omit = (fields: Fields, keys: readonly string[]): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)));

const nonEmpty = (fields: Fields): Fields | undefined => (Object.keys(fields).length > 0 ? fields : undefined);

const VIEW_PREFIX = 'view:';
const INSTANCE_PREFIX = 'instance:';

/** The fields a node keeps in its element's own slots. */
const NODE_SLOTS = [
  'type',
  'id',
  'z',
  'center',
  'size',
  'rotation',
  'label',
  'layer',
  'locked',
  'style',
  'class',
  'frame',
];

/** A placed composite's origin and scale back from its box and the region of its parts it shows. */
const unscaled = (node: Node): Pick<Scene.Element2D, 'center' | 'size' | 'scale'> => {
  const frame = nodeFrame(node);
  if (!frame || frame.width <= 0 || frame.height <= 0) {
    return { center: node.center, size: node.size };
  }
  const scale = { x: node.size.width / frame.width, y: node.size.height / frame.height };
  return {
    center: {
      x: node.center.x - scale.x * (frame.x + frame.width / 2),
      y: node.center.y - scale.y * (frame.y + frame.height / 2),
    },
    scale,
  };
};
const LINK_SLOTS = ['id', 'z', 'source', 'target', 'text', 'layer', 'locked', 'style', 'class'];

const canvasExtra = (fields: Fields, slots: readonly string[]): Fields => omit(fields, slots);

const nodeElement = (node: Node, objects: Map<string, Scene.Object2D>): Scene.Element2D => {
  const fields: Fields = { ...node };
  const extra = canvasExtra(fields, NODE_SLOTS);
  let placed: { object: string } | { type: string };
  // The node type and its scene or composite are kept too: a portal to a layout outside the drawing places an object
  // whose parts resolve to no layout, and must still read back as that portal.
  if (node.type === 'view' && typeof fields.scene === 'string') {
    const object = { id: `${VIEW_PREFIX}${fields.scene}`, type: 'rect', parts: fields.scene };
    objects.set(object.id, object);
    placed = { object: object.id };
    extra.type = 'view';
  } else if (node.type === 'instance' && typeof fields.composite === 'string') {
    const object = { id: `${INSTANCE_PREFIX}${fields.composite}`, type: 'rect', parts: fields.composite };
    objects.set(object.id, object);
    placed = { object: object.id };
    extra.type = 'instance';
  } else {
    placed = { type: node.type };
  }
  return {
    id: node.id,
    ...placed,
    z: node.z,
    ...unscaled(node),
    ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
    ...(typeof fields.label === 'string' ? { label: fields.label } : {}),
    ...(node.layer !== undefined ? { layer: node.layer } : {}),
    ...(node.locked !== undefined ? { locked: node.locked } : {}),
    ...(node.class !== undefined ? { style: node.class } : {}),
    ...(node.style ? { overrides: node.style } : {}),
    props: { canvas: extra },
  };
};

const linkElement = (link: Link): Scene.Element2D => {
  const extra = canvasExtra({ ...link }, LINK_SLOTS);
  return {
    id: link.id,
    type: 'link',
    z: link.z,
    source: elementEndpoint(link.source),
    target: elementEndpoint(link.target),
    ...(link.text !== undefined ? { label: link.text } : {}),
    ...(link.layer !== undefined ? { layer: link.layer } : {}),
    ...(link.locked !== undefined ? { locked: link.locked } : {}),
    ...(link.class !== undefined ? { style: link.class } : {}),
    ...(link.style ? { overrides: link.style } : {}),
    props: { canvas: extra },
  };
};

/**
 * A render list as a 2D layout and the objects its portals and instances place: a `view` node places the composite
 * object `view:<scene>`, an `instance` node the object `instance:<composite>`, each with the inner layout as its parts.
 * {@link toRenderList2D} reads the list back unchanged.
 */
export const fromRenderList2D = (view: RenderList2D): { layout: Scene.LayoutRecord2D; objects: Scene.Object2D[] } => {
  const objects = new Map<string, Scene.Object2D>();
  const elements: Record<string, Scene.Element2D> = {};
  for (const node of Object.values(view.nodes)) {
    elements[node.id] = nodeElement(node, objects);
  }
  for (const link of Object.values(view.links)) {
    elements[link.id] = linkElement(link);
  }
  return {
    layout: {
      id: view.id,
      dim: '2d',
      ...(view.name !== undefined ? { name: view.name } : {}),
      ...(view.layers !== undefined ? { layers: view.layers } : {}),
      ...(view.kind !== undefined ? { kind: view.kind } : {}),
      ...(view.anonymous !== undefined ? { anonymous: view.anonymous } : {}),
      elements,
    },
    objects: [...objects.values()],
  };
};

/** The element's style back onto the canvas node style (with any style an older layout kept under `props.canvas`). */
const canvasStyle = (style: Style2D | undefined, extra: unknown): Fields | undefined => {
  const merged: Fields = { ...(isRecord(extra) ? extra : {}), ...nodeStyle(style) };
  return nonEmpty(merged);
};

/** An element written by {@link fromRenderList2D} as the node it was. */
const canvasNode = (doc: Scene.SceneDocument, element: Resolved2D, canvas: Fields): Node | undefined => {
  const scaled = scaledFrame(doc, element);
  const center = scaled?.center ?? element.center;
  const size = scaled?.size ?? element.size;
  if (!center || !size || element.z === undefined) {
    return undefined;
  }
  const { style: extraStyle, type: storedType, ...extra } = canvas;
  const type =
    storedType === 'view' || storedType === 'instance'
      ? storedType
      : element.parts === undefined
        ? element.type
        : 'view';
  const style = canvasStyle(element.overrides, extraStyle);
  return {
    ...extra,
    type,
    id: element.id,
    z: element.z,
    center,
    size,
    ...(scaled ? { frame: scaled.frame } : {}),
    ...(element.rotation !== undefined ? { rotation: element.rotation } : {}),
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(element.layer !== undefined ? { layer: element.layer } : {}),
    ...(element.locked !== undefined ? { locked: element.locked } : {}),
    ...(element.style !== undefined ? { class: element.style } : {}),
    ...(style ? { style } : {}),
    ...(element.parts === undefined
      ? {}
      : type === 'instance'
        ? { composite: element.parts }
        : { scene: element.parts }),
  };
};

const toEndpoint = (end: ElementEndpoint | undefined, stored: unknown): Endpoint | undefined =>
  (end && endpoint(end)) ??
  (isRecord(stored) &&
  isRecord(stored.point) &&
  typeof stored.point.x === 'number' &&
  typeof stored.point.y === 'number'
    ? { point: { x: stored.point.x, y: stored.point.y } }
    : undefined);

const LINK_TYPES_BY_NAME: Readonly<Record<string, LinkType>> = {
  line: 'line',
  curve: 'curve',
  spline: 'spline',
  smart: 'smart',
};

const isStyleHue = (hue: string | undefined): hue is StyleHue => STYLE_HUES.some((candidate) => candidate === hue);

/** A link element written by {@link fromRenderList2D} as the link it was. */
const canvasLink = (element: Resolved2D, canvas: Fields): Link | undefined => {
  const { style: extraStyle, type: storedType, source, target, points, ...extra } = canvas;
  const sourceEnd = toEndpoint(element.source, source);
  const targetEnd = toEndpoint(element.target, target);
  if (!sourceEnd || !targetEnd || element.z === undefined) {
    return undefined;
  }
  const hue = element.overrides?.hue;
  const lineStyle = element.overrides?.lineStyle;
  const fontSize = element.overrides?.fontSize;
  const style = {
    ...(isRecord(extraStyle) ? extraStyle : {}),
    ...(isStyleHue(hue) ? { hue } : {}),
    ...(lineStyle !== undefined && lineStyle !== 'sketchy' ? { lineStyle } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
  };
  const base = {
    ...extra,
    id: element.id,
    z: element.z,
    source: sourceEnd,
    target: targetEnd,
    ...(element.label !== undefined ? { text: element.label } : {}),
    ...(element.layer !== undefined ? { layer: element.layer } : {}),
    ...(element.locked !== undefined ? { locked: element.locked } : {}),
    ...(element.style !== undefined ? { class: element.style } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };
  const type =
    typeof storedType === 'string' ? (LINK_TYPES_BY_NAME[storedType] ?? DEFAULT_LINK_TYPE) : DEFAULT_LINK_TYPE;
  return type === 'spline' ? { ...base, type, points: Array.isArray(points) ? points : [] } : { ...base, type };
};

/**
 * A 2D layout as the engine's render list. A layout {@link fromRenderList2D} wrote reads back as the list it was; any
 * other (a `.dx` document's) is drawn with the default layer and the scene kinds react-ui-canvas has nodes for.
 */
export const toRenderList2D = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): RenderList2D =>
  layout.layers !== undefined ||
  layout.kind !== undefined ||
  Object.values(layout.elements).some((element) => isRecord(element.props?.canvas))
    ? storedView(doc, layout)
    : toView(doc, layout);

/** An element's layer when its layout declares it; otherwise the default layer, which the list then declares. */
const layerOf = (layout: Scene.LayoutRecord2D, element: Resolved2D): string =>
  element.layer !== undefined && layout.layers?.[element.layer] !== undefined ? element.layer : DEFAULT_LAYER.id;

const storedView = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): RenderList2D => {
  // A canvas node resolves its class itself, so it reads back its own overrides rather than the resolved look.
  const own = (element: Resolved2D): Resolved2D => ({ ...element, overrides: layout.elements[element.id]?.overrides });
  const elements = Object.values(resolveLayout2D(doc, layout)).filter((element) => !element.hidden);
  // Elements a `.dx` document wrote have no canvas fields: they draw as `toView` draws them, among the rest.
  const native = elements.filter((element) => !isRecord(element.props?.canvas));
  const keys = initialKeys(native.length);
  const keyOf = (element: Resolved2D) => element.z ?? keys[native.indexOf(element)];
  const nodes: Record<string, Node> = {};
  const links: Record<string, Link> = {};
  for (const element of elements) {
    const stored = element.props?.canvas;
    if (!isRecord(stored) || element.type === 'link') {
      continue;
    }
    const node = canvasNode(doc, own(element), stored);
    node && (nodes[node.id] = node);
  }
  for (const element of native) {
    const node = toNode(doc, element, keyOf(element), layerOf(layout, element));
    node && (nodes[node.id] = node);
  }
  for (const element of elements) {
    const stored = element.props?.canvas;
    if (element.type !== 'link') {
      continue;
    }
    const link = isRecord(stored)
      ? canvasLink(own(element), stored)
      : toLink(element, keyOf(element), layerOf(layout, element), nodes);
    link && (links[link.id] = link);
  }
  // The default layer is declared only when an element falls back to it; the layout's own layers are kept as they are.
  const fallback = native.some((element) => layerOf(layout, element) === DEFAULT_LAYER.id);
  const layers = {
    ...(fallback ? { [DEFAULT_LAYER.id]: DEFAULT_LAYER } : {}),
    ...layout.layers,
  };
  return {
    ...(Object.keys(layers).length > 0 ? { layers } : {}),
    ...(layout.kind !== undefined ? { kind: layout.kind } : {}),
    ...(layout.anonymous !== undefined ? { anonymous: layout.anonymous } : {}),
    id: layout.id,
    ...(layout.name !== undefined ? { name: layout.name } : {}),
    nodes,
    links,
  };
};

const toView = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): RenderList2D => {
  const elements = Object.values(resolveLayout2D(doc, layout)).filter((element) => !element.hidden);
  const keys = initialKeys(elements.length);
  const nodes: Record<string, Node> = {};
  elements.forEach((element, index) => {
    const node = toNode(doc, element, element.z ?? keys[index], DEFAULT_LAYER.id);
    node && (nodes[node.id] = node);
  });
  const links: Record<string, Link> = {};
  elements.forEach((element, index) => {
    const link = toLink(element, element.z ?? keys[index], DEFAULT_LAYER.id, nodes);
    link && (links[link.id] = link);
  });
  return { id: layout.id, name: layout.name, nodes, links, layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER } };
};

/**
 * A document's 2D layouts as render lists, one per layout; the scene's layout is the root and comes first, and a
 * composite element is a `view` node over its parts layout's list. 3D layouts are left out.
 */
export const toRenderLists2D = (
  doc: Scene.SceneDocument,
  scene: Scene.SceneRecord | undefined = rootScene(doc),
): { lists: RenderList2D[]; root: ViewId } => {
  const rootLayout = sceneLayout(doc, scene)?.id;
  const lists = doc.layouts
    .flatMap((layout) => (layout.dim === '2d' ? [toRenderList2D(doc, layout)] : []))
    .sort((left, right) => Number(right.id === rootLayout) - Number(left.id === rootLayout));
  return { lists, root: lists[0]?.id ?? '' };
};

export type FromRenderLists2DOptions = {
  /** The layout the scene shows; the first list's when unset. */
  root?: string;
  /** The model's named styles, as the canvas's style classes. */
  styles?: StyleMap;
  /** The scene's theme. */
  theme?: string;
};

/**
 * A 2D document drawing `lists`, the inverse of {@link toRenderLists2D}: a layout per list, one model (`model`) holding
 * the objects its portals and instances place and the named styles, and one scene (`scene`) over `root`.
 */
export const fromRenderLists2D = (
  lists: readonly RenderList2D[],
  { root = lists[0]?.id ?? '', styles, theme }: FromRenderLists2DOptions = {},
): Scene.SceneDocument => {
  const objects: Record<string, Scene.Object2D> = {};
  const layouts = lists.map((list) => {
    const { layout, objects: placed } = fromRenderList2D(list);
    placed.forEach((object) => (objects[object.id] = object));
    return { ...layout, model: 'model' };
  });
  return {
    scenes: [
      {
        id: 'scene',
        dim: '2d',
        layout: root,
        camera: { center: { x: 0, y: 0 }, zoom: 1 },
        ...(theme !== undefined ? { theme } : {}),
      },
    ],
    layouts,
    models: [{ id: 'model', dim: '2d', objects, ...(styles ? { styles: namedStyles(styles) } : {}) }],
  };
};
