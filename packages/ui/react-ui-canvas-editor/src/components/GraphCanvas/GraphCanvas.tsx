//
// Copyright 2024 DXOS.org
//

import {
  Background,
  BackgroundVariant,
  Controls,
  type Dimensions,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlow,
  type ReactFlowProps,
  ReactFlowProvider,
  type XYPosition,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useContext, useEffect } from 'react';

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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<Polygon>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (graph) {
      setNodes(
        graph.nodes.map((node) => {
          const position = 'center' in node ? (node.center as XYPosition) : { x: 0, y: 0 };
          const size =
            'size' in node
              ? { width: (node.size as Dimensions).width, height: (node.size as Dimensions).height }
              : undefined;

          return {
            id: node.id,
            type: 'custom',
            position,
            origin: [0.5, 0.5],
            className: '-my-[1px] -mx-[1px]',
            data: node as Polygon,
            style: size,
          };
        }),
      );

      setEdges(
        graph.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      );
    }
  }, [graph?.nodes, graph?.edges]);

  const handleNodeDragStart = useCallback<NonNullable<ReactFlowProps['onNodeDragStart']>>((_event, node) => {
    // console.log('onNodeDragStart', JSON.stringify(node, null, 2));
  }, []);

  const handleNodeDragMove = useCallback<NonNullable<ReactFlowProps['onNodeDrag']>>((_event, node) => {
    // console.log('onNodeDrag', JSON.stringify(node, null, 2));
  }, []);

  const handleNodeDragStop = useCallback<NonNullable<ReactFlowProps['onNodeDragStop']>>(
    (_event, node) => {
      const graphNode = graph?.nodes.find((n) => n.id === node.id);
      if (graphNode && 'center' in graphNode) {
        (graphNode.center as XYPosition) = node.position;
        // console.log('onNodeDragStop', JSON.stringify({ node, graphNode }, null, 2));
      }
    },
    [graph?.nodes],
  );

  const handleNodesDelete = useCallback<NonNullable<ReactFlowProps['onNodesDelete']>>((nodes) => {
    // console.log('onNodesDelete', nodes);
  }, []);

  const handleEdgesDelete = useCallback<NonNullable<ReactFlowProps['onEdgesDelete']>>((edges) => {
    // console.log('onEdgesDelete', edges);
  }, []);

  if (!graph) {
    return null;
  }

  const snap = 16;

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
      snapToGrid={true}
      snapGrid={[snap, snap]}
      zoomOnScroll={false}
      onNodeDragStart={handleNodeDragStart}
      onNodeDrag={handleNodeDragMove}
      onNodeDragStop={handleNodeDragStop}
      onNodesChange={onNodesChange}
      onNodesDelete={handleNodesDelete}
      onEdgesChange={onEdgesChange}
      onEdgesDelete={handleEdgesDelete}
    >
      <Background
        id='grid-minor'
        gap={snap}
        className='!bg-transparent [&>*>*.lines]:dark:!stroke-neutral-750'
        variant={BackgroundVariant.Lines}
      />
      <Background
        id='grid-major'
        gap={snap * 4}
        className='!bg-transparent [&>*>*.lines]:dark:!stroke-neutral-700'
        variant={BackgroundVariant.Lines}
      />
      <Controls />
    </ReactFlow>
  );
};

export const GraphCanvas = (props: GraphCanvasProps) => (
  // TODO(burdon): Move Provider to Root.
  <ReactFlowProvider>
    <GraphCanvasInner {...props} />
  </ReactFlowProvider>
);
