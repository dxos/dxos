//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import type { Model } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import type { GraphNode } from '@dxos/graph';
import { failedInvariant } from '@dxos/invariant';
import { type ComputeShape, type StateMachine } from '../compute';
import { type Connection } from '../types';
import { type GraphMonitor } from './context';
import { raise } from '@dxos/debug';

export const useGraphMonitor = (machine?: StateMachine): GraphMonitor => {
  return useMemo<GraphMonitor>(() => {
    return {
      onCreate: (shape) => {
        if (!machine) {
          return;
        }

        // TODO(dmaretskyi): Specialize the monitor.
        const node = createNodeFromShape(shape as GraphNode<ComputeShape>);
        machine.addNode(node);
        (shape as GraphNode<ComputeShape>).data.node = node.id;
      },

      onLink: (edgeShape) => {
        if (machine) {
          // TODO(burdon): Check type.
          const data = edgeShape.data as Connection;
          const { input, output } = data ?? {};
          machine.addEdge({
            id: edgeShape.id,
            source: edgeShape.source,
            target: edgeShape.target,
            data: { input, output },
          });
        }
      },
    };
  }, [machine]);
};

export const createNodeFromShape = (shape: GraphNode<ComputeShape>): GraphNode<Model.ComputeGraphNode> => {
  const factory =
    nodeFactory[shape.data.type ?? raise(new Error(`Shape type not registered: ${shape.data.type}`))] ??
    failedInvariant();
  return factory(shape);
};

const nodeFactory: Record<string, (shape: GraphNode<ComputeShape>) => GraphNode<Model.ComputeGraphNode>> = {
  switch: (shape) => ({
    id: ObjectId.random(),
    type: 'switch',
    data: {
      type: 'switch',
    },
  }),
  and: (shape) => ({
    id: ObjectId.random(),
    type: 'and',
    data: {
      type: 'and',
    },
  }),
  or: (shape) => ({
    id: ObjectId.random(),
    type: 'or',
    data: {
      type: 'or',
    },
  }),
  not: (shape) => ({
    id: ObjectId.random(),
    type: 'not',
    data: {
      type: 'not',
    },
  }),
  beacon: (shape) => ({
    id: ObjectId.random(),
    type: 'beacon',
    data: {
      type: 'beacon',
    },
  }),
};
