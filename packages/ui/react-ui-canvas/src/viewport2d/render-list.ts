//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  type Bounds,
  BuiltinNode,
  Color,
  type ElementEndpoint,
  type Endpoint,
  type Link,
  LINK_KIND,
  LINK_PATHS,
  MARKERS,
  type NamedStyle2D,
  type Node,
  NODE_KINDS,
  type Resolved2D,
  Scene,
  type Size,
  type Style2D,
  type StyleMap,
  type ViewId,
  findLayout,
  findModel,
  isInstanceNode,
  nodeFrame,
  resolveLayout2D,
  rootScene,
  sceneLayout,
  solidBounds2D,
  solidOperands,
} from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import {
  DEFAULT_LAYER,
  DERIVED_NODE_FIELDS,
  createNode,
  fitHulls,
  gridPitch,
  initialKeys,
  isSolidNode,
  solidRings,
} from '../utils/index.ts';

const isColor = Schema.is(Color);

/** A look that states something; one with no field is no look at all, so a node carries none. */
const stated = (style: Style2D | undefined): Style2D | undefined =>
  style && Object.keys(style).length > 0 ? style : undefined;

/** A model's named styles as the canvas's style classes. */
export const styleClasses = (styles: Readonly<Record<string, NamedStyle2D>> | undefined): StyleMap =>
  Object.fromEntries(
    Object.entries(styles ?? {}).map(([id, { name, ...look }]) => {
      const style = stated(look);
      return [id, { id, name: name ?? id, ...(style ? { style } : {}) }];
    }),
  );

/** The canvas's style classes as a model's named styles. */
export const namedStyles = (classes: StyleMap): Record<string, NamedStyle2D> =>
  Object.fromEntries(Object.values(classes).map(({ id, name, style }) => [id, { name, ...style }]));

const ORIGIN = { x: 0, y: 0 };
const UNIT_SCALE = { x: 1, y: 1 };

/** A placed composite's box and fixed region: its parts' bounds at its `scale` about its origin (decision 18). */
type ScaledFrame = { center: { x: number; y: number }; size: { width: number; height: number }; frame: Bounds };

/**
 * Undefined for an element with a frame of its own and no scale, or whose parts have nothing with a frame. One with
 * no centre places its parts where they are, at their own size, as a group does and as 3D places such an element.
 */
const scaledFrame = (doc: Scene.SceneDocument, element: Resolved2D): ScaledFrame | undefined => {
  const parts = element.parts === undefined ? undefined : findLayout(doc, element.parts);
  if ((!element.scale && element.center) || parts?.dim !== '2d') {
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
  const { center = ORIGIN, scale = UNIT_SCALE } = element;
  return {
    center: { x: center.x + scale.x * (x + width / 2), y: center.y + scale.y * (y + height / 2) },
    size: { width: width * scale.x, height: height * scale.y },
    frame: { x, y, width, height },
  };
};

/** The size a kind the engine has no factory for falls back to, when the element gives none. */
const FALLBACK_SIZE: Size = { width: 96, height: 48 };

/** The fields each of the engine's own kinds cannot be drawn without, by kind. */
const REQUIRED_FIELDS: ReadonlyMap<string, readonly string[]> = new Map(
  BuiltinNode.members.map((member) => [
    member.fields.kind.literal,
    Object.entries(member.fields).flatMap(([name, field]) => (field.ast.context?.isOptional === true ? [] : [name])),
  ]),
);

/**
 * A new node of one of the engine's own kinds, cut down to the fields the kind requires: what an element that states
 * none of them (a polyline with no points, in a layout written as text) still needs to draw. A setting the kind only
 * offers a default for is left unset, so a node reads back as it was written.
 */
const requiredDefaults = (node: BuiltinNode): Node => {
  const required = REQUIRED_FIELDS.get(node.kind) ?? [];
  const { kind, id, z, center, size } = node;
  return {
    ...Object.fromEntries(Object.entries(node).filter(([name]) => required.includes(name))),
    kind,
    id,
    z,
    center,
    size,
  };
};

type Fields = Record<string, unknown>;

const omit = <T extends object>(fields: T, keys: readonly string[]): Fields =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)));

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

//
// A render list written as a layout: an element is the node or the link itself, so a render list read back from its
// layout is the one that was written. Only a placed composite differs, which the scene model says as an object.
//

const VIEW_PREFIX = 'view:';
const INSTANCE_PREFIX = 'instance:';

/** What a node works out as it is read: its box when it places a composite at a scale, and a solid's outline. */
const READ_FIELDS: readonly string[] = ['frame', ...DERIVED_NODE_FIELDS];

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

const nodeElement = (node: Node, objects: Map<string, Scene.Object2D>): Scene.ElementRecord2D => {
  // The frame is the composite's scale as the element stores it, so the size it gave the node is not stored beside it.
  const { center: _center, size: _size, ...fields } = node;
  const scene: unknown = Reflect.get(node, 'scene');
  // The node keeps its scene or composite beside the object it places: a portal to a layout outside the drawing
  // places an object whose parts resolve to no layout, and must still read back as that portal.
  const parts = node.kind === 'view' && typeof scene === 'string' ? scene : undefined;
  // An instance naming the model object it was read from (a group) keeps placing that one, which is the node's field.
  const named = isInstanceNode(node) && typeof Reflect.get(node, 'object') === 'string';
  const placed =
    parts !== undefined
      ? { id: `${VIEW_PREFIX}${parts}`, kind: 'rect', parts }
      : isInstanceNode(node) && !named
        ? { id: `${INSTANCE_PREFIX}${node.composite}`, kind: 'rect', parts: node.composite }
        : undefined;
  placed && objects.set(placed.id, placed);
  return {
    ...omit(fields, READ_FIELDS),
    id: node.id,
    // Its own kind beside the object: a kind that draws a composite (a card, a UML class) reads back as that kind,
    // and is an Object because it names one, not because it is called `instance`.
    kind: node.kind,
    ...(placed ? { object: placed.id } : {}),
    ...unscaled(node),
  };
};

const linkElement = ({ source, target, ...link }: Link): Scene.ElementRecord2D => ({
  ...link,
  source: elementEndpoint(source),
  target: elementEndpoint(target),
});

/**
 * A render list as a 2D layout and the objects its portals and instances place: a `view` node places the composite
 * object `view:<scene>`, an `instance` node the object `instance:<composite>`, each with the inner layout as its parts.
 * {@link toRenderList2D} reads the list back unchanged.
 */
export const fromRenderList2D = (view: RenderList2D): { layout: Scene.LayoutRecord2D; objects: Scene.Object2D[] } => {
  const objects = new Map<string, Scene.Object2D>();
  const elements: Record<string, Scene.ElementRecord2D> = {};
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

//
// A layout read as a render list.
//

/** What an element has that its node has not: where the scene model places it, and what other writers keep on it. */
const ELEMENT_FIELDS: readonly string[] = [
  'object',
  'parts',
  'scale',
  'props',
  'source',
  'target',
  'pinned',
  'dsl',
  'center',
  'size',
  'overrides',
];

/** What a layout's elements are read against: its own records, its model, and every other 2D layout's element ids. */
type Reading = {
  readonly doc: Scene.SceneDocument;
  readonly layout: Scene.LayoutRecord2D;
  readonly model: Scene.ModelRecord2D | undefined;
  /** Whether another 2D layout of the document holds an element of this id. */
  readonly elsewhere: (id: string) => boolean;
};

const reading = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): Reading => {
  const model = layout.model === undefined ? undefined : findModel(doc, layout.model);
  let others: Set<string> | undefined;
  return {
    doc,
    layout,
    model: model?.dim === '2d' ? model : undefined,
    elsewhere: (id) => {
      others ??= new Set(
        doc.layouts.flatMap((other) => (other.dim === '2d' && other !== layout ? Object.keys(other.elements) : [])),
      );
      return others.has(id);
    },
  };
};

/**
 * The look a node or link carries. The canvas folds a named style in itself, from the model's styles, so an element
 * whose style is one of those reads back its own overrides and the list round-trips. Any other look the canvas
 * cannot derive (the object's, a layout's override of a style) is carried resolved.
 */
const ownLook = ({ layout, model }: Reading, element: Resolved2D): Style2D | undefined => {
  const own = layout.elements[element.id];
  const object = own?.object === undefined ? undefined : model?.objects[own.object];
  const style = element.style;
  const derivable =
    object?.overrides === undefined &&
    object?.style === undefined &&
    (style === undefined || (model?.styles?.[style] !== undefined && layout.styles?.[style] === undefined));
  return stated(derivable ? own?.overrides : element.overrides);
};

/**
 * An element as the node it draws as. A composite element (its object has parts) is the kind it names, else an
 * `instance` where its object says it is an Object or a group, else a `view` over its parts. Any other kind is drawn as itself:
 * the engine's own start from the kind's defaults, so a template that gives a polyline no points still draws, and a
 * kind the engine does not know is a box.
 */
const toNode = (context: Reading, element: Resolved2D, z: string): Node | undefined => {
  const layer = layerOf(context.layout, element);
  const { kind: stated, object: placing } = context.layout.elements[element.id] ?? {};
  const kind =
    element.parts === undefined
      ? element.kind
      : stated !== undefined && stated.length > 0
        ? stated
        : element.kind === 'instance' || element.kind === 'group'
          ? 'instance'
          : 'view';
  const scaled = scaledFrame(context.doc, element);
  const center = scaled?.center ?? element.center;
  if (kind.length === 0 || kind === LINK_KIND || (kind === 'group' && element.parts === undefined) || !center) {
    return undefined;
  }
  const size = scaled?.size ?? element.size;
  const builtin = NODE_KINDS.find((candidate) => candidate === kind);
  const overrides = ownLook(context, element);
  // An Object is a symbol repeated and a `view` is a place to drill into: a node naming a composite is the first,
  // however it is spelled, and only a portal takes the parts as a scene.
  const isObject = kind === 'instance' || typeof element.composite === 'string';
  return {
    ...(builtin
      ? requiredDefaults(createNode({ kind: builtin, id: element.id, z, center, size, scene: element.parts }))
      : { kind, id: element.id, z, center, size: size ?? FALLBACK_SIZE }),
    ...omit(element, ELEMENT_FIELDS),
    // What other writers keep in `props` is theirs to change, so it wins over a copy the node once wrote.
    ...element.props,
    kind,
    z,
    ...(layer !== undefined ? { layer } : {}),
    ...(scaled ? { frame: scaled.frame } : {}),
    ...(overrides ? { overrides } : {}),
    ...(element.parts === undefined ? {} : isObject ? { composite: element.parts } : { scene: element.parts }),
    // A model object placed by name is not the one an instance node makes for itself, so the node has to say which.
    ...(kind === 'instance' && element.parts !== undefined && placing !== `${INSTANCE_PREFIX}${element.parts}`
      ? { object: placing }
      : {}),
  };
};

/**
 * An element as the link it draws as: one whose ends are both free or on nodes of the list. An end on a node of
 * another layout is kept (a hull's nodes stand in the scene that places it, once it is opened out); an end on
 * nothing, or on an element this list leaves out, is not a link to draw (Review Focus 1).
 */
const toLink = (
  context: Reading,
  element: Resolved2D,
  z: string,
  nodes: Readonly<Record<string, Node>>,
): Link | undefined => {
  const source = element.source && endpoint(element.source);
  const target = element.target && endpoint(element.target);
  const drawn = (end: Endpoint) =>
    !('node' in end) ||
    nodes[end.node] !== undefined ||
    (context.layout.elements[end.node] === undefined && context.elsewhere(end.node));
  if (element.kind !== LINK_KIND || !source || !target || !drawn(source) || !drawn(target)) {
    return undefined;
  }
  // A path a newer editor wrote is one this one cannot run, so the link takes the default.
  const path = LINK_PATHS.find((candidate) => candidate === element.path);
  const tail = MARKERS.find((marker) => marker === element.tail);
  // A layout written as text states its arrowhead among its `props`.
  const head = MARKERS.find((marker) => marker === (element.head ?? element.props?.end));
  const { color, stroke, fontSize } = ownLook(context, element) ?? {};
  const overrides = {
    // A layout written by hand may state anything, and a link draws only what is a colour.
    ...(isColor(color) ? { color } : {}),
    ...(stroke !== undefined ? { stroke } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
  };
  const points = element.points ?? (path === 'spline' ? [] : undefined);
  const layer = layerOf(context.layout, element);
  return {
    kind: LINK_KIND,
    id: element.id,
    z,
    source,
    target,
    ...(path ? { path } : {}),
    ...(points ? { points } : {}),
    ...(tail ? { tail } : {}),
    ...(head ? { head } : {}),
    ...(element.label !== undefined ? { label: element.label } : {}),
    ...(layer !== undefined ? { layer } : {}),
    ...(element.locked !== undefined ? { locked: element.locked } : {}),
    ...(element.style !== undefined ? { style: element.style } : {}),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
    ...(element.connector !== undefined ? { connector: element.connector } : {}),
    ...(element.constrain !== undefined ? { constrain: element.constrain } : {}),
  };
};

/**
 * The layer an element is on. A layout that declares layers is read as written: an element keeps the layer it names,
 * or none. A layout that declares none has one, the default, which its list declares and every element is on, so the
 * editor has a layer to add another beside and the pin that keeps each element on its layer changes nothing.
 */
const layerOf = (layout: Scene.LayoutRecord2D, element: Resolved2D): string | undefined =>
  layout.layers === undefined ? DEFAULT_LAYER.id : element.layer;

/** A node of a layout by its element's id, hidden or not, as it would draw. */
type OperandLookup = (id: string) => Node | undefined;

/**
 * The nodes a layout's elements draw as, each read once and only when asked for. A solid's operands are in no list
 * while it stands for them: they are read here, to frame the solid and to work out its outline.
 */
const operandNodes = (context: Reading, resolved: Readonly<Record<string, Resolved2D>>): OperandLookup => {
  const read = new Map<string, Node | undefined>();
  const lookup: OperandLookup = (id) => {
    if (!read.has(id)) {
      // Set before it is read, so a solid named among its own operands finds nothing rather than itself.
      read.set(id, undefined);
      const element = resolved[id];
      read.set(
        id,
        element === undefined
          ? undefined
          : toNode(context, framedSolid(element, lookup), element.z ?? initialKeys(1)[0]),
      );
    }
    return read.get(id);
  };
  return lookup;
};

/**
 * A solid the model made with no frame, framed: an operand that takes its size from the object it places cannot be
 * measured from the layout alone, so its solid is framed here, by the box the model would have used
 * (`solidBounds2D`) over the operands as they resolve. Any other element as it is.
 */
const framedSolid = (element: Resolved2D, lookup: OperandLookup): Resolved2D => {
  if (element.kind !== 'solid' || (element.center && element.size)) {
    return element;
  }
  const bounds = solidBounds2D(element.props?.op, solidOperands(element.props?.operands).map(lookup));
  return bounds && bounds.width > 0 && bounds.height > 0
    ? {
        ...element,
        center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        size: { width: bounds.width, height: bounds.height },
      }
    : element;
};

/** The nodes with each solid's outline set: what its operands make, joined or cut. */
const withSolidOutlines = (nodes: Record<string, Node>, lookup: OperandLookup): Record<string, Node> => {
  const solids = Object.values(nodes).filter(isSolidNode);
  if (solids.length === 0) {
    return nodes;
  }
  return {
    ...nodes,
    ...Object.fromEntries(
      solids.flatMap((solid) => {
        const rings = solidRings(solid, lookup);
        return rings ? [[solid.id, { ...solid, rings }]] : [];
      }),
    ),
  };
};

/**
 * The elements a list holds. A hidden element is left out, except in a composite's definition, where a hidden part
 * is one an instance may show again and so must stay in the list; a solid's operand is left out wherever it is.
 */
const listed = (layout: Scene.LayoutRecord2D, resolved: Readonly<Record<string, Resolved2D>>): Resolved2D[] => {
  const operands = new Set(
    Object.values(resolved).flatMap((element) =>
      element.kind === 'solid' ? solidOperands(element.props?.operands) : [],
    ),
  );
  return Object.values(resolved).filter(
    (element) => !operands.has(element.id) && (layout.kind === 'composite' || !element.hidden),
  );
};

/**
 * A 2D layout as the engine's render list. An element is read as the node or link it is, whoever wrote it: one the
 * editor wrote reads back as it was written, and one a `.dx` document wrote takes a paint order and its kind's defaults.
 */
export const toRenderList2D = (doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): RenderList2D => {
  const context = reading(doc, layout);
  const resolved = resolveLayout2D(doc, layout);
  const elements = listed(layout, resolved);
  // An element with no paint order takes one after the others of its kind in the layout's own order.
  const unordered = elements.filter((element) => element.z === undefined);
  const keys = initialKeys(unordered.length);
  const keyOf = (element: Resolved2D) => element.z ?? keys[unordered.indexOf(element)];
  const lookup = operandNodes(context, resolved);
  const nodes: Record<string, Node> = {};
  for (const element of elements) {
    const node = toNode(context, framedSolid(element, lookup), keyOf(element));
    node && (nodes[node.id] = node);
  }
  const links: Record<string, Link> = {};
  for (const element of elements) {
    const link = toLink(context, element, keyOf(element), nodes);
    link && (links[link.id] = link);
  }
  // A hull's frame is wherever the nodes inside it are, so it is set as the list is read rather than trusted as stored.
  return fitHulls(
    {
      layers: layout.layers ?? { [DEFAULT_LAYER.id]: DEFAULT_LAYER },
      ...(layout.kind !== undefined ? { kind: layout.kind } : {}),
      ...(layout.anonymous !== undefined ? { anonymous: layout.anonymous } : {}),
      id: layout.id,
      ...(layout.name !== undefined ? { name: layout.name } : {}),
      nodes: withSolidOutlines(nodes, lookup),
      links,
    },
    layout.lattice,
    gridPitch(layout),
  );
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
