//
// Copyright 2026 DXOS.org
//

//
// Declarative scene fixtures for stories and tests: a scene is a tree of element values, each made by a
// factory and refined with `properties()`, so a fixture reads like the diagram it describes. A nested
// `scene` is a scene shape and its child scene in one; `build()` flattens the tree into the scenes a
// store holds. Boxes are top-left; refs like `a#e2` name a port and `@x,y` a free end.
//

import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { type NodeRegistry, defaultNodeRegistry } from '../model/registry.ts';
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
  type PortalNode,
  type Scene,
  type SceneId,
} from '../model/types.ts';
import { initialKeys } from './order.ts';
import { createNode } from './shapes.ts';

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

export type BuilderElement = NodeElement<NodeBase> | LinkElement<Link> | SceneElement;

/**
 * A scene and its elements in paint order. At the top it is the root scene; nested, it is also a scene
 * shape placed with `at()`, whose child scene shares its id.
 */
export class SceneElement {
  readonly kind = 'scene';

  constructor(
    readonly id: SceneId,
    readonly elements: readonly BuilderElement[],
    readonly frame?: Box,
    readonly sceneName?: string,
    readonly portal: NodeProperties<PortalNode> = {},
  ) {}

  /** The scene's name (breadcrumbs, previews). */
  name(name: string): SceneElement {
    return new SceneElement(this.id, this.elements, this.frame, name, this.portal);
  }

  /** Where the scene shape sits in its parent scene; required for a nested scene. */
  at(box: Box): SceneElement {
    return new SceneElement(this.id, this.elements, box, this.sceneName, this.portal);
  }

  /** The scene shape's own properties (label, contents, style). */
  properties(values: NodeProperties<PortalNode>): SceneElement {
    return new SceneElement(this.id, this.elements, this.frame, this.sceneName, {
      ...this.portal,
      ...values,
      ...mergeStyle(this.portal, values),
    });
  }

  /** Every scene of the tree, the root first, checked against `registry`'s node schemas. */
  build(registry: NodeRegistry = defaultNodeRegistry): SceneTree {
    const scenes: Scene[] = [];
    buildScene(this, registry, scenes);
    return { root: this.id, scenes };
  }
}

export type SceneTree = { root: SceneId; scenes: Scene[] };

const buildScene = (element: SceneElement, registry: NodeRegistry, scenes: Scene[]): void => {
  const nodes: Record<string, Node> = {};
  const links: Record<string, Link> = {};
  const keys = initialKeys(element.elements.length);
  const index = scenes.push({ id: element.id, name: element.sceneName, nodes, links }) - 1;
  element.elements.forEach((child, order) => {
    const z = keys[order];
    switch (child.kind) {
      case 'node': {
        // A host's type starts from its own `create`, as a built-in starts from `createNode`, so a
        // fixture sets only what it means and the type supplies the rest of its content.
        const def = isBuiltinType(child.node.type) ? undefined : registry[child.node.type];
        const fresh = def?.create({ id: child.node.id, z, center: child.node.center, size: child.node.size });
        const node = { ...fresh, ...child.node, z };
        check(registry, node);
        claim(nodes, node.id, element.id);
        nodes[node.id] = node;
        break;
      }
      case 'link': {
        const id = child.linkId ?? uniqueId(links, linkId(child.link.source, child.link.target));
        claim(links, id, element.id);
        links[id] = { ...child.link, id, z };
        break;
      }
      case 'scene': {
        if (!child.frame) {
          throw new Error(`Nested scene ${child.id} needs a frame: call at(box).`);
        }
        const node: PortalNode = {
          ...createNode({ type: 'scene', id: child.id, z, center: center(child.frame), size: sizeOf(child.frame) }),
          ...child.portal,
          type: 'scene',
          scene: child.id,
        };
        check(registry, node);
        claim(nodes, node.id, element.id);
        nodes[node.id] = node;
        buildScene(child, registry, scenes);
        break;
      }
    }
  });
  scenes[index] = { ...scenes[index], nodes, links };
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
const claim = (taken: Record<string, unknown>, id: string, sceneId: SceneId): void => {
  if (id in taken) {
    throw new Error(`Duplicate id ${id} in scene ${sceneId}.`);
  }
};

const linkId = (source: Endpoint, target: Endpoint): string => {
  const name = (end: Endpoint) => ('node' in end ? end.node : `${end.point.x},${end.point.y}`);
  return `${name(source)}-${name(target)}`;
};

const uniqueId = (taken: Record<string, unknown>, id: string): string => {
  let candidate = id;
  for (let suffix = 2; candidate in taken; ++suffix) {
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

const BUILTIN_TYPES: readonly string[] = ['rect', 'ellipse', 'note', 'scene'] satisfies BuiltinNodeType[];
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

/** Factories for scene fixtures; see the module comment. */
export const SceneBuilder = {
  /** A scene of `elements`; the root of a fixture, or nested, a scene shape and its child scene. */
  scene: (id: SceneId, elements: readonly BuilderElement[] = []) => new SceneElement(id, elements),
  node,
  rect: (id: string, box: Box) => node('rect', id, box),
  ellipse: (id: string, box: Box) => node('ellipse', id, box),
  note: (id: string, box: Box) => node('note', id, box),
  link,
};
