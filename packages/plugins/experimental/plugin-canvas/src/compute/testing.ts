//
// Copyright 2024 DXOS.org
//

import { GraphModel, type GraphNode } from '@dxos/graph';

import { createAnd, createFunction, createSwitch, createTimer } from './shapes';
import type { Shape } from '../types';

// TODO(burdon): Incorrect inference in Webstorm.
export const testGraph = new GraphModel<GraphNode<Shape>>()
  .addNode({
    id: 'node-a',
    data: createFunction({
      id: 'node-a',
      center: { x: -128, y: 0 },
    }),
  })
  .addNode({
    id: 'node-b',
    data: createFunction({
      id: 'node-b',
      center: { x: 128, y: 0 },
    }),
  })
  .addNode({
    id: 'node-c',
    data: createTimer({ id: 'node-c', center: { x: -320, y: 0 } }),
  })
  .addNode({
    id: 'node-d',
    data: createAnd({ id: 'node-d', center: { x: -128, y: -256 } }),
  })
  .addNode({
    id: 'node-e',
    data: createSwitch({ id: 'node-e', center: { x: -320, y: -256 } }),
  })
  .addEdge({
    id: 'node-a-to-node-b',
    source: 'node-a',
    target: 'node-b',
    data: { property: 'prop-3' },
  })
  .addEdge({
    id: 'node-c-to-node-a',
    source: 'node-c',
    target: 'node-a',
    data: { property: 'prop-1' },
  })
  .addEdge({
    id: 'node-b-to-node-d',
    source: 'node-b',
    target: 'node-d',
    data: { property: 'b' },
  })
  .addEdge({
    id: 'node-d-to-node-b',
    source: 'node-d',
    target: 'node-b',
    data: { property: 'prop-1' },
  })
  .addEdge({
    id: 'node-e-to-node-d',
    source: 'node-e',
    target: 'node-d',
    data: { property: 'a' },
  });
