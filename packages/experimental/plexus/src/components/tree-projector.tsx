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

  private getOrCreateNode(id: string): GraphLayoutNode<N> {
    const node = this._layout.graph.nodes.find((node) => node.id === id);
    if (node) {
      return Object.assign(node, { last: [node.x, node.y] });
    }

    return {
      id,
      initialized: true,
      last: [0, 0]
    };
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
    const root = Object.assign(this.getOrCreateNode(selected), {
      selected,
      x: center[0],
      y: center[1],
      r: this.options.nodeRadius * 2
    });

    // Create or update nodes.
    const nodes: GraphLayoutNode<N>[] = [root];

    const getNode = (id: string) => data?.nodes.find((node) => node.id === id);
    const rootNode = getNode(selected)!;

    // TODO(burdon): Children not present on GraphNode (custom).

    // Children.
    const layer1 = rootNode.children;
    nodes.push(...this.layoutArc(layer1 ?? [], center, Math.PI, Math.PI * 0.4, this.options.radius));

    const layer2 = rootNode.children?.flatMap((node) => node.children ?? []);
    nodes.push(...this.layoutArc(layer2 ?? [], center, Math.PI, Math.PI * 0.4, this.options.radius * 1.7));

    // TODO(burdon): Set initial position from selected node.

    // TODO(burdon): Parents.
    const parents: GraphNode[] = [];
    data?.links.forEach((link) => {
      if (link.source === selected) {
        const target = getNode(link.target);
        if (target?.children?.findIndex((node) => node.id === selected) !== -1) {
          parents.push(target);
        }
      }

      if (link.target === selected) {
        const source = getNode(link.source);
        if (source?.children?.findIndex((node) => node.id === selected) !== -1) {
          parents.push(source);
        }
      }
    });
    nodes.push(...this.layoutArc(parents ?? [], center, 0 / 6, Math.PI / 6, this.options.radius * 1.7));

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
              targetStart: target.last
            };
          }

          return undefined;
        })
        .filter(Boolean) as GraphLayoutLink<N>[]) ?? [];

    this._layout = {
      graph: {
        nodes,
        links
      }
    };
  }

  layoutArc(nodes: GraphNode[], center: Point, start = 0, arc = 0, rx = 160, ry = rx): GraphLayoutNode<N>[] {
    let a = start;
    const length = arc === 0 ? nodes.length : nodes.length - 1;
    const da = length > 0 ? arc / length : 0;
    if (length > 0) {
      a = start - arc / 2;
    }

    return nodes.map((node) => {
      const n = Object.assign(this.getOrCreateNode(node.id), {
        x: center[0] + Math.sin(a) * rx,
        y: center[1] - Math.cos(a) * ry,
        r: this.options.nodeRadius
      });

      a += da;
      return n;
    });
  }

  layoutHorizontal(nodes: GraphNode[], center: Point, width: number) {
    // let x = -width / 2;
    // const dx = nodes.length === 1 ? 0 : width / (nodes.length - 1);
    // nodes.forEach((node) => {
    //   this._points.set(node.id, [x, center[1]]);
    //   x += dx;
    // });
  }

  layoutVertical(nodes: GraphNode[], center: Point, height: number) {
    // let y = -height / 2;
    // const dy = nodes.length === 1 ? 0 : height / (nodes.length - 1);
    // nodes.forEach((node) => {
    //   this._points.set(node.id, [center[0], y]);
    //   y += dy;
    // });
  }
}
