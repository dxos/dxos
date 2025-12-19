//
// Copyright 2024 DXOS.org
//

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useContext, useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { EditorContext } from '../../hooks';
import { type CanvasGraphModel, type Polygon } from '../../types';

import { GraphNode } from './GraphNode';

const nodeTypes: NodeTypes = {
  custom: GraphNode,
};

export type GraphCanvasProps = ThemedClassName<React.PropsWithChildren> & {
  graph?: CanvasGraphModel;
};

const GraphCanvasInner = ({ classNames, children, graph: graphParam }: GraphCanvasProps) => {
  const { themeMode } = useThemeContext();
  const context = useContext(EditorContext);
  const graph = graphParam ?? context?.graph;

  // Map graph nodes to React Flow nodes.
  const nodes: Node<Polygon>[] = useMemo(
    () =>
      graph?.nodes.map((node) => {
        // TODO(burdon): Handle PathShape.
        const position = 'center' in node ? (node.center as { x: number; y: number }) : { x: 0, y: 0 };
        const size =
          'size' in node
            ? { width: (node.size as { width: number }).width, height: (node.size as { height: number }).height }
            : undefined;
        return {
          id: node.id,
          type: 'custom',
          position,
          data: node as Polygon,
          style: size,
        };
      }) ?? [],
    [graph?.nodes],
  );

  // Map edges.
  const edges: Edge[] = useMemo(
    () =>
      graph?.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })) ?? [],
    [graph?.edges],
  );

  if (!graph) {
    return null;
  }

  return (
    <ReactFlow
      className={mx('is-full bs-full', classNames)}
      colorMode={themeMode}
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      fitView={true}
      fitViewOptions={{ maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
      zoomOnScroll={false}
      onNodeDrag={(node) => {
        console.log('onNodeDragStop', node);
      }}
    >
      {/* TODO(burdon): Tailwind defs. */}
      <Background
        id='1'
        gap={16}
        bgColor='transparent'
        color={themeMode === 'dark' ? '#202020' : '#e0e0e0'}
        variant={BackgroundVariant.Lines}
      />
      <Background
        id='2'
        gap={64}
        bgColor='transparent'
        color={themeMode === 'dark' ? '#303030' : '#d0d0d0'}
        variant={BackgroundVariant.Lines}
      />
      <Controls />
      {children}
    </ReactFlow>
  );
};

export const GraphCanvas = (props: GraphCanvasProps) => (
  // TODO(burdon): Move Provider to Root.
  <ReactFlowProvider>
    <GraphCanvasInner {...props} />
  </ReactFlowProvider>
);
