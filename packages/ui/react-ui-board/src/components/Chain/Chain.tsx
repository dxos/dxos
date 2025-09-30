//
// Copyright 2025 DXOS.org
//

import './styles.css';

import {
  BackgroundVariant,
  type Edge,
  Background as NaturalBackground,
  type Node,
  ReactFlow,
  type ReactFlowProps,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import React, { type PropsWithChildren } from 'react';

import { CustomNode } from './CustomNode';

// NOTE: Experimental (possible replacement for react-ui-canvas; additional possible use for entity relationships.)
// TODO(burdon): Demo storybook using @dxos/schema/testing.
// TODO(burdon): Create relation editor.
// TODO(burdon): Selection model.
// TODO(burdon): Stack of selected cards (form editor).
// TODO(burdon): Inline form editor (inside node?)

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

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const nodeTypes = {
  custom: CustomNode,
};

// TODO(burdon): Use @dxos/graph types.
export type NodeType = Node<{ label: string }>;
export type EdgeType = Edge;

//
// Root
//

type RootProps = PropsWithChildren<Pick<ReactFlowProps<NodeType, EdgeType>, 'nodes' | 'edges'>>;

const Root = ({ children, nodes: initialNodes, edges: initialEdges }: RootProps) => {
  const [nodes, _setNodes, handleNodesChange] = useNodesState<NodeType>(initialNodes ?? []);
  const [edges, _setEdges, handleEdgesChange] = useEdgesState<EdgeType>(initialEdges ?? []);

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
      {children}
    </ReactFlow>
  );
};

//
// Background
//

const Background = () => <NaturalBackground variant={BackgroundVariant.Dots} gap={16} size={0.5} />;

//
// Chain
//

export const Chain = {
  Root,
  Background,
};

export type { RootProps as ChainRootProps };
