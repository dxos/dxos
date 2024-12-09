//
// Copyright 2024 DXOS.org
//

// TODO(burdon): workerize-loader dep.
import { Graph, type Node, type PlainObject } from '@antv/graphlib';
import { D3ForceLayout } from '@antv/layout';
import { createBindingId, createShapeId, type Editor, type SerializedStore, type TLRecord } from '@tldraw/tldraw';

import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

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

  const edges = range(faker.number.int({ min: nodes.length, max: nodes.length * 2 })).map(() => {
    invariant(nodes.length >= 2);
    let source: Node<PlainObject>;
    let target: Node<PlainObject>;
    do {
      source = faker.helpers.arrayElement(nodes);
      target = faker.helpers.arrayElement(nodes);
    } while (source.id === target.id);

    return { id: faker.string.uuid(), source: source.id, target: target.id, data: {} };
  });

  return new Graph<PlainObject, PlainObject>({ nodes, edges });
};

export const drawGraph = async (
  editor: Editor,
  graph: Graph<PlainObject, PlainObject>,
): Promise<SerializedStore<TLRecord>> => {
  const grid = 40;
  const nodeSize = 80;

  const snap = (n: number) => Math.round(n / grid) * grid;

  const layout = new D3ForceLayout({
    center: [0, 0],
    preventOverlap: true,
    collideStrength: 0.5,
    linkDistance: grid * 2,
    nodeSize,
    nodeSpacing: nodeSize,
  });
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
