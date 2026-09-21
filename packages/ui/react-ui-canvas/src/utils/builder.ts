//
// Copyright 2026 DXOS.org
//

//
// Chainable scene builder, after plugin-illustrator's DSL builders: a scene is written as a sequence of
// typed node and link calls in grid-friendly top-left coordinates and refs like `a#e2` name a port, so
// fixtures, stories and tests read like a diagram description instead of a record dump.
//

import { type Endpoint, type Link, type Node, type Point, type Scene, type SceneId } from '../model/types.ts';
import { initialKeys } from './order.ts';

/** Top-left box geometry; the builder stores the centre. */
export type Box = { x: number; y: number; width: number; height: number };

const center = ({ x, y, width, height }: Box): Point => ({ x: x + width / 2, y: y + height / 2 });

/** `node` or `node#port`. */
const endpoint = (ref: string): Endpoint => {
  const [node, port] = ref.split('#');
  return port ? { node, port } : { node };
};

/** `Omit` over each member of a union, not over their intersection. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type Pending = { node?: DistributiveOmit<Node, 'z'>; link?: DistributiveOmit<Link, 'z'> };

export class SceneBuilder {
  static create(id: SceneId, name?: string): SceneBuilder {
    return new SceneBuilder(id, name);
  }

  readonly #id: SceneId;
  readonly #name?: string;
  readonly #elements: Pending[] = [];

  private constructor(id: SceneId, name?: string) {
    this.#id = id;
    this.#name = name;
  }

  rect(id: string, box: Box, label?: string): this {
    return this.#node({ type: 'rect', id, center: center(box), size: { width: box.width, height: box.height }, label });
  }

  ellipse(id: string, box: Box, label?: string): this {
    return this.#node({ type: 'ellipse', id, center: center(box), rx: box.width / 2, ry: box.height / 2, label });
  }

  class(id: string, box: Box, name: string, attributes: string[] = [], methods: string[] = []): this {
    return this.#node({
      type: 'class',
      id,
      center: center(box),
      size: { width: box.width, height: box.height },
      name,
      attributes,
      methods,
    });
  }

  text(id: string, box: Box, text: string): this {
    return this.#node({ type: 'text', id, center: center(box), size: { width: box.width, height: box.height }, text });
  }

  /** A portal to `scene`; its size fixes the frame the child is centred in. */
  portal(id: string, box: Box, scene: SceneId): this {
    return this.#node({
      type: 'scene',
      id,
      center: center(box),
      size: { width: box.width, height: box.height },
      scene,
    });
  }

  line(id: string, from: string, to: string): this {
    return this.#link({ type: 'line', id, source: endpoint(from), target: endpoint(to) });
  }

  curve(id: string, from: string, to: string): this {
    return this.#link({ type: 'curve', id, source: endpoint(from), target: endpoint(to) });
  }

  spline(id: string, from: string, to: string, points: Point[]): this {
    return this.#link({ type: 'spline', id, source: endpoint(from), target: endpoint(to), points });
  }

  /** Nodes and links in call order, each with its own z key. */
  build(): Scene {
    const keys = initialKeys(this.#elements.length);
    const nodes: Record<string, Node> = {};
    const links: Record<string, Link> = {};
    this.#elements.forEach(({ node, link }, index) => {
      if (node) {
        nodes[node.id] = { ...node, z: keys[index] };
      }
      if (link) {
        links[link.id] = { ...link, z: keys[index] };
      }
    });
    return { id: this.#id, name: this.#name, nodes, links };
  }

  #node(node: DistributiveOmit<Node, 'z'>): this {
    this.#elements.push({ node });
    return this;
  }

  #link(link: DistributiveOmit<Link, 'z'>): this {
    this.#elements.push({ link });
    return this;
  }
}
