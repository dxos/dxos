//
// Copyright 2025 DXOS.org
//

import './styles.css';

import {
  ReactFlow,
  type ReactFlowProps,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import React from 'react';

import { CustomNode } from './CustomNode';

// Examples:
// https://reactflow.dev/showcase
// https://reactflow.dev/examples/edges/edge-label-renderer
// https://reactflow.dev/examples/grouping/sub-flows
// https://reactflow.dev/examples/edges/floating-edges
// https://reactflow.dev/examples/edges/animating-edges
// https://reactflow.dev/examples/styling/turbo-flow
// https://app.chartdb.io/diagrams/ecw8wwk9wklg328u1z5269dey
// https://www.simple-ai.dev/docs/react-flow/components/generate-text-node
// https://www.jsonsea.com

// TODO(burdon): Create relation editor.
// TODO(burdon): Selection model.
// TODO(burdon): Stack of selected cards (form editor).
// TODO(burdon): Inline form editor (inside node?)

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const nodeTypes = {
  custom: CustomNode,
};

// TODO(burdon): Use @dxos/graph types.
export type NodeType = Node<{ label: string }>;
export type EdgeType = Edge;

type BoardRootProps = Pick<ReactFlowProps<NodeType, EdgeType>, 'nodes' | 'edges'>;

const BoardRoot = (data: BoardRootProps) => {
  const [nodes, _setNodes, handleNodesChange] = useNodesState<NodeType>(data.nodes ?? []);
  const [edges, _setEdges, handleEdgesChange] = useEdgesState<EdgeType>(data.edges ?? []);

  return (
    <ReactFlow<NodeType, EdgeType>
      defaultViewport={defaultViewport}
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.5 }}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={0.5} />
    </ReactFlow>
  );
};

export const Board = {
  Root: BoardRoot,
};

export type { BoardRootProps };
