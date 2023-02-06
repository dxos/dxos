//
// Copyright 2023 DXOS.org
//

import { Point } from '@dxos/gem-core';
import {
  GraphData,
  GraphLayout,
  GraphLayoutLink,
  GraphLayoutNode,
  GraphLink,
  GraphNode,
  Projector
} from '@dxos/gem-spore';

// TODO(burdon): Merge defaults.
export type TreeProjectorOptions = {
  center?: Point;
  radius: number;
  nodeRadius: number;
  slots?: {
    root?: string;
    node?: string;
    link?: string;
  };
};

export class TreeProjector<N extends GraphNode = GraphNode> extends Projector<
  GraphData<N>,
  GraphLayout<N>,
  TreeProjectorOptions
> {
  _layout: GraphLayout<N> = {
    graph: {
      nodes: [],
      links: []
    }
  };

  get layout() {
    return this._layout;
  }

  protected override onUpdate(data?: GraphData<N>, selected?: string) {
    if (!selected) {
      return {
        graph: {
          nodes: [],
          links: []
        }
      };
    }

    const center = this.options.center ?? [0, 0];

    const getNode = (id: string) => data?.nodes.find((node) => node.id === id);
    const rootNode = getNode(selected)!;
    const root = Object.assign(this.getOrCreateNode(rootNode), {
      selected,
      x: center[0],
      y: center[1],
      r: this.options.nodeRadius * 3,
      data: rootNode,
      className: this.options.slots?.root
    });

    // Create or update nodes.
    const nodes: GraphLayoutNode<N>[] = [root];

    // TODO(burdon): Children not present on GraphNode (custom).
    const getChildren = (node: N): N[] => (node as any).children ?? [];

    const inner = this.options.radius;
    const outer = this.options.radius * 2;

    // Children.
    const layer1 = getChildren(rootNode);
    nodes.push(...this.layoutArc(layer1, center, Math.PI, Math.PI * 0.5, inner));

    const layer2 = getChildren(rootNode).flatMap((node) => getChildren(node));
    nodes.push(...this.layoutArc(layer2 ?? [], center, Math.PI, Math.PI * 0.5, outer));

    // Parents and lateral.
    // TODO(burdon): More efficient. Should children be links?
    const parents: N[] = [];
    const lateral: N[] = [];
    data?.links.forEach((link) => {
      const source = getNode(link.source)!;
      const target = getNode(link.target)!;

      if (link.source === selected) {
        if (getChildren(target).find((node) => node.id === selected)) {
          parents.push(target);
        } else {
          if (!getChildren(rootNode).find((node) => node.id === link.target)) {
            lateral.push(target);
          }
        }
      } else if (link.target === selected) {
        if (getChildren(source).find((node) => node.id === selected)) {
          parents.push(source);
        } else {
          if (!getChildren(rootNode).find((node) => node.id === link.source)) {
            lateral.push(source);
          }
        }
      }
    });

    // Parents.
    nodes.push(...this.layoutArc(parents, center, 0, Math.PI / 4, outer));

    // Lateral.
    nodes.push(...this.layoutArc(lateral, center, -Math.PI / 2, Math.PI / 5, outer));

    // Create or update links.
    const links: GraphLayoutLink<N>[] =
      (data?.links
        .map((link: GraphLink) => {
          const source = nodes.find((node) => node.id === link.source);
          const target = nodes.find((node) => node.id === link.target);
          if (source && target) {
            const existing = this._layout.graph.links.find(({ id }) => id === link.id);
            if (existing) {
              return existing;
            }

            return {
              id: link.id,
              source,
              target,
              sourceStart: source.last,
              targetStart: target.last,
              className: this.options.slots?.link
            };
          }

          return undefined;
        })
        .filter(Boolean) as GraphLayoutLink<N>[]) ?? [];

    this._layout = {
      guides: [
        {
          type: 'circle',
          cx: 0,
          cy: 0,
          r: inner
        },
        {
          type: 'circle',
          cx: 0,
          cy: 0,
          r: outer
        }
      ],
      graph: {
        nodes,
        links
      }
    };
  }

  private layoutArc(nodes: N[], center: Point, start = 0, arc = 0, rx = 160, ry = rx): GraphLayoutNode<N>[] {
    let a = start;
    const length = arc === 0 ? nodes.length : nodes.length - 1;
    const da = length > 0 ? arc / length : 0;
    if (length > 0) {
      a = start - arc / 2;
    }

    return nodes.map((node) => {
      const n = Object.assign(this.getOrCreateNode(node), {
        x: center[0] + Math.sin(a) * rx,
        y: center[1] - Math.cos(a) * ry,
        r: this.options.nodeRadius,
        className: this.options.slots?.node
      });

      a += da;
      return n;
    });
  }

  private getOrCreateNode(dataNode: N): GraphLayoutNode<N> {
    const node = this._layout.graph.nodes.find((node) => node.id === dataNode.id);
    if (node) {
      return Object.assign(node, { last: [node.x, node.y] });
    }

    return {
      id: dataNode.id,
      initialized: true,
      last: [0, 0],
      data: dataNode,
      className: this.options.slots?.node
    };
  }
}
