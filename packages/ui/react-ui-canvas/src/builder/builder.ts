//
// Copyright 2026 DXOS.org
//

//
// Declarative View fixtures for stories and tests: a View is a tree of element values, each made by a
// factory and refined with `properties()`, so a fixture reads like the diagram it describes. A nested
// `view` is a view node and its child View in one; `build()` flattens the tree into the Views a
// store holds. Boxes are top-left; refs like `a#e2` name a port and `@x,y` a free end.
//

import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import {
  type BuiltinNode,
  type BuiltinNodeType,
  type Endpoint,
  type Link,
  type LinkType,
  type Node,
  type NodeBase,
  type NodeStyle,
  type Point,
  type ViewId,
  type ViewNode,
} from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import { type NodeRegistry, type RenderList2D } from '../model/index.ts';
import { DEFAULT_LAYER, createNode, initialKeys } from '../utils/index.ts';

/** Top-left box geometry; the builder stores the centre. */
export type Box = { x: number; y: number; width: number; height: number };

const center = ({ x, y, width, height }: Box): Point => ({ x: x + width / 2, y: y + height / 2 });

/** `node`, `node#port`, or a free end `@x,y`. */
const endpoint = (ref: string): Endpoint => {
  if (ref.startsWith('@')) {
    const [x, y] = ref.slice(1).split(',').map(Number);
    return { point: { x, y } };
  }
  const [node, port] = ref.split('#');
  return port ? { node, port } : { node };
};

type NodeOf<T extends BuiltinNodeType> = Extract<BuiltinNode, { type: T }>;
type LinkOf<T extends LinkType> = Extract<Link, { type: T }>;

/** What `properties()` may set on a node: everything but its identity, its paint order and the frame its box fixes. */
export type NodeProperties<N> = Partial<Omit<N, 'id' | 'type' | 'z' | 'center' | 'size'>>;

/** What `properties()` may set on a link: everything but its identity, its paint order and its ends. */
export type LinkProperties<L> = Partial<Omit<L, 'id' | 'type' | 'z' | 'source' | 'target'>>;

type NodeBody = Omit<NodeBase, 'z'> & Record<string, unknown>;
type LinkBody = DistributiveOmit<Link, 'z' | 'id'>;

/** `Omit` over each member of a union, not over their intersection. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Later values win; `style` merges key by key, so one call can add a hue without dropping another's fill. */
const mergeStyle = (base: { style?: NodeStyle }, values: { style?: NodeStyle }) =>
  base.style || values.style ? { style: { ...base.style, ...values.style } } : {};

/**
 * A node of the scene, as written: refine it with `properties()`, which returns a new value. `N` types
 * the properties; `build()` checks the result against the type's schema.
 */
export class NodeElement<N extends NodeBase> {
  readonly kind = 'node';

  constructor(readonly node: NodeBody) {}

  properties(values: NodeProperties<N>): NodeElement<N> {
    return new NodeElement<N>({ ...this.node, ...values, ...mergeStyle(this.node, values) });
  }
}

/** A link of the scene, as written; its id defaults to its ends (`a-b`), unique within the scene. */
export class LinkElement<L extends Link> {
  readonly kind = 'link';

  constructor(
    readonly link: LinkBody,
    readonly linkId?: string,
  ) {}

  id(id: string): LinkElement<L> {
    return new LinkElement<L>(this.link, id);
  }

  properties(values: LinkProperties<L>): LinkElement<L> {
    return new LinkElement<L>({ ...this.link, ...values }, this.linkId);
  }
}

export type BuilderElement = NodeElement<NodeBase> | LinkElement<Link> | ViewElement;

/**
 * A View and its elements in paint order. At the top it is the root View; nested, it is also a view
 * node placed with `at()`, whose child View shares its id.
 */
export class ViewElement {
  readonly kind = 'view';

  constructor(
    readonly id: ViewId,
    readonly elements: readonly BuilderElement[],
    readonly frame?: Box,
    readonly viewName?: string,
    readonly portal: NodeProperties<ViewNode> = {},
  ) {}

  /** The View's name (breadcrumbs, previews). */
  name(name: string): ViewElement {
    return new ViewElement(this.id, this.elements, this.frame, name, this.portal);
  }

  /** Where the view node sits in its parent View; required for a nested View. */
  at(box: Box): ViewElement {
    return new ViewElement(this.id, this.elements, box, this.viewName, this.portal);
  }

  /** The view node's own properties (label, link, style). */
  properties(values: NodeProperties<ViewNode>): ViewElement {
    return new ViewElement(this.id, this.elements, this.frame, this.viewName, {
      ...this.portal,
      ...values,
      ...mergeStyle(this.portal, values),
    });
  }

  /** Every View of the tree, the root first, checked against `registry`'s node schemas. */
  build(registry: NodeRegistry = defaultNodeRegistry): ViewTree {
    const views: RenderList2D[] = [];
    buildView(this, registry, views);
    return { root: this.id, views };
  }
}

export type ViewTree = { root: ViewId; views: RenderList2D[] };

const buildView = (element: ViewElement, registry: NodeRegistry, views: RenderList2D[]): void => {
  // Maps, so any id (`constructor`, `__proto__`) is an ordinary key; `fromEntries` keeps them own properties.
  const nodes = new Map<string, Node>();
  const links = new Map<string, Link>();
  const keys = initialKeys(element.elements.length);
  // Every element names its layer, so a fixture reads as a View the editor wrote.
  const index =
    views.push({
      id: element.id,
      name: element.viewName,
      nodes: {},
      links: {},
      layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER },
    }) - 1;
  element.elements.forEach((child, order) => {
    const z = keys[order];
    switch (child.kind) {
      case 'node': {
        // A host's type starts from its own `create`, as a built-in starts from `createNode`, so a
        // fixture sets only what it means and the type supplies the rest of its content.
        const def = isBuiltinType(child.node.type) ? undefined : registry[child.node.type];
        const fresh = def?.create({ id: child.node.id, z, center: child.node.center, size: child.node.size });
        const node = { layer: DEFAULT_LAYER.id, ...fresh, ...child.node, z };
        check(registry, node);
        claim(nodes, node.id, element.id);
        nodes.set(node.id, node);
        break;
      }
      case 'link': {
        const id = child.linkId ?? uniqueId(links, linkId(child.link.source, child.link.target));
        claim(links, id, element.id);
        links.set(id, { layer: DEFAULT_LAYER.id, ...child.link, id, z });
        break;
      }
      case 'view': {
        if (!child.frame) {
          throw new Error(`Nested view ${child.id} needs a box: call at(box).`);
        }
        const node: ViewNode = {
          ...createNode({ type: 'view', id: child.id, z, center: center(child.frame), size: sizeOf(child.frame) }),
          layer: DEFAULT_LAYER.id,
          ...child.portal,
          type: 'view',
          scene: child.id,
        };
        check(registry, node);
        claim(nodes, node.id, element.id);
        nodes.set(node.id, node);
        buildView(child, registry, views);
        break;
      }
    }
  });
  views[index] = { ...views[index], nodes: Object.fromEntries(nodes), links: Object.fromEntries(links) };
};

/** A node its type does not describe (a wrong value, or a property the type does not have) fails the build. */
const check = (registry: NodeRegistry, node: Node): void => {
  const def = registry[node.type];
  if (!def) {
    return;
  }
  const result = Schema.encodeExit(def.schema, { onExcessProperty: 'error' })(node);
  if (Exit.isFailure(result)) {
    throw new Error(`Node ${node.id} is not a valid ${node.type}: ${result.cause}`);
  }
};

/** Two elements given one id would leave only the second, so the fixture fails instead. */
const claim = (taken: ReadonlyMap<string, unknown>, id: string, viewId: ViewId): void => {
  if (taken.has(id)) {
    throw new Error(`Duplicate id ${id} in view ${viewId}.`);
  }
};

const linkId = (source: Endpoint, target: Endpoint): string => {
  const name = (end: Endpoint) => ('node' in end ? end.node : `${end.point.x},${end.point.y}`);
  return `${name(source)}-${name(target)}`;
};

const uniqueId = (taken: ReadonlyMap<string, unknown>, id: string): string => {
  let candidate = id;
  for (let suffix = 2; taken.has(candidate); ++suffix) {
    candidate = `${id}-${suffix}`;
  }
  return candidate;
};

const sizeOf = ({ width, height }: Box) => ({ width, height });

/** A built-in node of `type` with the type's default content, refined by `properties()`. */
function node<T extends BuiltinNodeType>(type: T, id: string, box: Box): NodeElement<NodeOf<T>>;
/** A host node type: whatever the host's registry schema accepts. */
function node(type: string, id: string, box: Box): NodeElement<NodeBase & Record<string, unknown>>;
function node(type: string, id: string, box: Box): NodeElement<NodeBase> {
  const base = { type, id, center: center(box), size: sizeOf(box) };
  if (isBuiltinType(type)) {
    const { z: _, ...fresh } = createNode({ ...base, type, z: '' });
    return new NodeElement<NodeBase>({ ...fresh });
  }
  return new NodeElement<NodeBase>(base);
}

const BUILTIN_TYPES: readonly string[] = [
  'rect',
  'ellipse',
  'cloud',
  'polygon',
  'polyline',
  'note',
  'view',
] satisfies BuiltinNodeType[];
const isBuiltinType = (type: string): type is BuiltinNodeType => BUILTIN_TYPES.includes(type);

type Ends = Pick<Link, 'source' | 'target'>;

const LINKS: Record<LinkType, (ends: Ends) => LinkBody> = {
  line: (ends) => ({ type: 'line', ...ends }),
  curve: (ends) => ({ type: 'curve', ...ends }),
  spline: (ends) => ({ type: 'spline', ...ends, points: [] }),
  smart: (ends) => ({ type: 'smart', ...ends }),
};

/** A link of `type` from one ref to another; a spline starts with no control points. */
const link = <T extends LinkType>(type: T, from: string, to: string): LinkElement<LinkOf<T>> =>
  new LinkElement<LinkOf<T>>(LINKS[type]({ source: endpoint(from), target: endpoint(to) }));

/** Factories for View fixtures; see the module comment. */
export const ViewBuilder = {
  /** A View of `elements`; the root of a fixture, or nested, a view node and its child View. */
  view: (id: ViewId, elements: readonly BuilderElement[] = []) => new ViewElement(id, elements),
  node,
  rect: (id: string, box: Box) => node('rect', id, box),
  ellipse: (id: string, box: Box) => node('ellipse', id, box),
  cloud: (id: string, box: Box) => node('cloud', id, box),
  polygon: (id: string, box: Box) => node('polygon', id, box),
  polyline: (id: string, box: Box) => node('polyline', id, box),
  note: (id: string, box: Box) => node('note', id, box),
  link,
};
