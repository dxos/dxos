//
// Copyright 2023 DXOS.org
//

import defaulstDeep from 'lodash.defaultsdeep';

import { type GraphEdge, type GraphModel } from '@dxos/graph';
import {
  type Point,
  type SVGContext,
  type GraphLayout,
  type GraphLayoutNode,
  Projector,
  type ProjectorOptions,
} from '@dxos/react-ui-graph';

export type TreeProjectorOptions = ProjectorOptions &
  Partial<{
    show?: {
      parents?: boolean;
      lateral?: boolean;
    };
    center?: Point;
    radius?: number;
    nodeRadius?: number;
    classes?: {
      guide?: {
        circle?: string;
      };
      node?: {
        circle?: string;
        text?: string;
      };
      link?: {
        path?: string;
      };
    };
  }>;

const defaultOptions: Partial<TreeProjectorOptions> = {
  show: {
    parents: true,
    lateral: true,
  },
  classes: {
    node: {
      circle: 'fill-gray-100',
    },
  },
};

export class TreeProjector<N> extends Projector<GraphModel, GraphLayout<N>, TreeProjectorOptions> {
  _layout: GraphLayout<N> = {
    graph: {
      nodes: [],
      edges: [],
    },
  };

  constructor(context: SVGContext, options?: Partial<TreeProjectorOptions>) {
    super(context, defaulstDeep({}, options, defaultOptions));
  }

  get layout() {
    return this._layout;
  }

  override onUpdate(data?: GraphModel, selected?: string): { graph: { nodes: never[]; edges: never[]; }; } | undefined {
    if (!selected) {
      return {
        graph: {
          nodes: [],
          edges: [],
        },
      };
    }

    const center = this.options.center ?? [0, 0];

    const getNode = (id: string) => data?.nodes.find((node) => this.options.idAccessor(node) === id);
    const rootNode = getNode(selected)!;
    const root = Object.assign(this.getOrCreateNode(rootNode), {
      selected,
      x: center[0],
      y: center[1],
      r: (this.options.nodeRadius ?? 16) * 3, // TODO(burdon): Factor out default.
      data: rootNode, // TODO(burdon): Merge Deep defaults for root class..
    });

    // Create or update nodes.
    const nodes: GraphLayoutNode<N>[] = [root];

    // TODO(burdon): Children not present on GraphNode (custom).
    const getChildren = (node: N): N[] => (node as any).children ?? [];

    const inner = this.options.radius ?? 160;
    const outer = inner * 2;

    const arc = this.options.show?.lateral ? Math.PI / 2 : this.options.show?.parents ? Math.PI : 0;

    // Children.
    // TODO(burdon): Place children in center of grandchildren.
    const layer1 = getChildren(rootNode);
    nodes.push(...this.layoutArc(layer1, center, Math.PI, arc, inner));

    const layer2 = getChildren(rootNode).flatMap((node) => getChildren(node));
    nodes.push(...this.layoutArc(layer2 ?? [], center, Math.PI, arc, outer));

    // Parents and lateral.
    // TODO(burdon): More efficient. Should children be links?
    const parents: N[] = [];
    const lateral: N[] = [];
    if (this.options.show?.parents || this.options.show?.lateral) {
      data?.edges.forEach((edge) => {
        const source = getNode(edge.source)!;
        const target = getNode(edge.target)!;

        if (edge.source === selected) {
          if (getChildren(target).find((node) => this.options.idAccessor(node) === selected)) {
            parents.push(target);
          } else {
            if (!getChildren(rootNode).find((node) => this.options.idAccessor(node) === edge.target)) {
              lateral.push(target);
            }
          }
        } else if (edge.target === selected) {
          if (getChildren(source).find((node) => this.options.idAccessor(node) === selected)) {
            parents.push(source);
          } else {
            if (!getChildren(rootNode).find((node) => this.options.idAccessor(node) === edge.source)) {
              lateral.push(source);
            }
          }
        }
      });
    }

    // Parents.
    if (this.options.show?.parents) {
      nodes.push(...this.layoutArc(parents, center, 0, Math.PI / 4, outer));
    }

    // Lateral.
    if (this.options.show?.lateral) {
      nodes.push(...this.layoutArc(lateral, center, -Math.PI / 2, Math.PI / 5, outer));
    }

    // Create or update links.
    const links: GraphLayoutLink<N>[] =
      (data?.edges
        .map((edge: GraphEdge) => {
          const source = nodes.find((node) => node.id === edge.source);
          const target = nodes.find((node) => node.id === edge.target);
          if (source && target) {
            const existing = this._layout.graph.edges.find(({ id }) => id === edge.id);
            if (existing) {
              return existing;
            }

            return {
              id: edge.id,
              source,
              target,
              sourceStart: source.last,
              targetStart: target.last,
              classes: this.options.classes?.link,
            };
          }

          return undefined;
        })
        .filter(Boolean) as GraphLayoutLink<N>[]) ?? [];

    this._layout = {
      guides: [
        {
          id: 'g2',
          type: 'circle',
          cx: 0,
          cy: 0,
          r: outer,
          classes: {
            circle: this.options.classes?.guide?.circle,
          },
        },
        {
          id: 'g1',
          type: 'circle',
          cx: 0,
          cy: 0,
          r: inner,
          classes: {
            circle: this.options.classes?.guide?.circle,
          },
        },
      ],
      graph: {
        nodes,
        links,
      },
    };
  }

  private layoutArc(nodes: N[], center: Point, start = 0, arc = 0, rx = 160, ry = rx): GraphLayoutNode<N>[] {
    let a = start;
    const length = arc === 0 ? nodes.length : nodes.length - 1;
    const da = length > 0 ? (arc || Math.PI * 2) / length : 0;
    if (length > 0) {
      a = start - arc / 2;
    }

    return nodes.map((node) => {
      const n = Object.assign(this.getOrCreateNode(node), {
        x: center[0] + Math.sin(a) * rx,
        y: center[1] - Math.cos(a) * ry,
        r: this.options.nodeRadius,
        className: this.options.classes?.node,
      });

      a += da;
      return n;
    });
  }

  private getOrCreateNode(dataNode: N): GraphLayoutNode<N> {
    const node = this._layout.graph.nodes.find((node) => node.id === this.options.idAccessor(dataNode));
    if (node) {
      return Object.assign(node, { last: [node.x, node.y] });
    }

    return {
      id: this.options.idAccessor(dataNode),
      initialized: true,
      last: [0, 0],
      data: dataNode,
      classes: this.options.classes?.node,
    };
  }
}
