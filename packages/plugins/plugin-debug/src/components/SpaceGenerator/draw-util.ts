//
// Copyright 2024 DXOS.org
//

// TODO(burdon): workerize-loader dep.
import { Graph, type Edge, type PlainObject } from '@antv/graphlib';
import {
  D3ForceLayout,
  type D3ForceLayoutOptions,
  GridLayout,
  type GridLayoutOptions,
  RadialLayout,
  type RadialLayoutOptions,
} from '@antv/layout';
import { type Layout } from '@antv/layout/lib/types';
import { createBindingId, createShapeId, type Editor, type SerializedStore, type TLRecord } from '@tldraw/tldraw';

import { faker } from '@dxos/random';
import { isNotFalsy, range } from '@dxos/util';

// TODO(burdon): Graph layout:
//  - https://www.npmjs.com/package/@antv/layout (uses d3)
//    - https://observablehq.com/d/2db6b0cc5e97d8d6
//    - https://github.com/antvis/graphlib
//  - https://www.npmjs.com/package/@dagrejs/dagre
//    - https://github.com/dagrejs/dagre/wiki
//  - https://www.npmjs.com/package/elkjs

// TLDraw structure:
//    svg tl-svg-context
//    div tl-html-layer tl-shapes
//      div tl-shape
//        svg tl-svg-container
//        div class tl-html-container
//    div tl-overlays
//      svg

/**
 * https://github.com/antvis/graphlib/blob/master/docs/classes/Graph.md
 */
// TODO(burdon): Factor out.
// TODO(burdon): Map ECHO to Graph.
export const generateGraph = (): Graph<PlainObject, PlainObject> => {
  const nodes = range(faker.number.int({ min: 8, max: 32 })).map(() => ({
    id: faker.string.uuid(),
    data: {
      label: faker.lorem
        .words(2)
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('-'),
    },
  }));

  const unlinked = new Set(nodes.map((node) => node.id));
  const pop = () => {
    if (unlinked.size) {
      const id = faker.helpers.arrayElement(Array.from(unlinked));
      unlinked.delete(id);
      return id;
    }
  };

  const edges: Edge<PlainObject>[] = [];
  const link = (source: string, target: string) => {
    edges.push({ id: faker.string.uuid(), source, target, data: {} });
  };

  const branching = 3;
  const traverse = (source: string) => {
    const targets = range(faker.number.int({ min: 1, max: branching }))
      .map(() => {
        const target = pop();
        if (target) {
          link(source, target);
        }
        return target;
      })
      .filter(isNotFalsy);

    for (const target of targets) {
      traverse(target);
    }
  };

  const source = pop();
  if (source) {
    traverse(source);
  }

  return new Graph<PlainObject, PlainObject>({ nodes, edges });
};

export const drawGraph = async (
  editor: Editor,
  graph: Graph<PlainObject, PlainObject>,
): Promise<SerializedStore<TLRecord>> => {
  const grid = 40;
  const nodeSize = 80;

  const snap = (n: number) => Math.round(n / grid) * grid;

  type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
    ? First & Intersection<Rest>
    : unknown;

  const defaultOptions: Intersection<[D3ForceLayoutOptions, GridLayoutOptions, RadialLayoutOptions]> = {
    center: [0, 0],
    width: grid * 20,
    height: grid * 20,
    linkDistance: grid * 2,
    nodeSize,
    nodeSpacing: nodeSize,
    preventOverlap: true,
  };

  const layoutType = faker.helpers.arrayElement(['d3force', 'grid', 'radial']);
  let layout: Layout<any>;
  switch (layoutType) {
    case 'd3force': {
      layout = new D3ForceLayout({
        ...defaultOptions,
        nodeStrength: 0.3,
        collideStrength: 0.8,
      });
      break;
    }

    case 'grid': {
      layout = new GridLayout({
        ...defaultOptions,
      });
      break;
    }

    case 'radial':
    default: {
      layout = new RadialLayout({
        ...defaultOptions,
        focusNode: graph.getAllNodes()[0],
        unitRadius: grid * 2,
      });
    }
  }

  const { nodes, edges } = await layout.execute(graph);

  for (const node of nodes) {
    const id = createShapeId(node.id as string);
    editor.createShape({
      id,
      type: 'geo',
      x: snap(node.data.x),
      y: snap(node.data.y),
      props: {
        w: nodeSize,
        h: nodeSize,
        text: node.data.label,
      },
    });
  }

  for (const edge of edges) {
    const arrowId = createShapeId(edge.id as string);
    editor.createShape({ id: arrowId, type: 'arrow' });

    editor.createBinding({
      id: createBindingId(),
      type: 'arrow',
      fromId: arrowId,
      toId: createShapeId(edge.source as string),
      props: {
        terminal: 'start',
        isExact: false,
        isPrecise: false,
        normalizedAnchor: { x: 0.5, y: 0.5 },
      },
    });

    editor.createBinding({
      id: createBindingId(),
      type: 'arrow',
      fromId: arrowId,
      toId: createShapeId(edge.target as string),
      props: {
        terminal: 'end',
        isExact: false,
        isPrecise: false,
        normalizedAnchor: { x: 0.5, y: 0.5 },
      },
    });
  }

  const data = editor.store.getStoreSnapshot();
  // TODO(burdon): Strip readonly properties (e.g., `meta`). Factor out.
  const content: SerializedStore<TLRecord> = JSON.parse(JSON.stringify(data.store));

  return content;
};
