//
// Copyright 2024 DXOS.org
//

import {
  Background,
  BackgroundVariant,
  Controls,
  type Dimensions,
  type Edge,
  MiniMap,
  type Node,
  type NodeTypes,
  ReactFlow,
  type ReactFlowProps,
  ReactFlowProvider,
  type XYPosition,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // TODO(burdon): Replace with tailwind; or override vars (e.g., --xy-background-color-default)
import React, { type PropsWithChildren, useCallback, useContext, useEffect } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { EditorContext } from '../../hooks';
import { type CanvasGraphModel, type Polygon } from '../../types';

import { GraphNode } from './GraphNode';

const nodeTypes: NodeTypes = {
  custom: GraphNode,
};

export type GraphCanvasProps = ThemedClassName<PropsWithChildren> & {
  graph?: CanvasGraphModel;
  grid?: 'grid' | 'dots';
  map?: boolean;
};

const GraphCanvasInner = ({ classNames, children, graph: graphProp, grid, map }: GraphCanvasProps) => {
  const { themeMode } = useThemeContext();
  const context = useContext(EditorContext);
  const graph = graphProp ?? context?.graph;

  // Map graph nodes to React Flow nodes.
  const [nodes, setNodes, handleNodesChange] = useNodesState<Node<Polygon>>([]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<Edge>([]);

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
            // Fix alignment.
            className: grid === 'grid' ? '-my-[1px] -mx-[1px]' : undefined,
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
          sourceHandle: edge.output,
          targetHandle: edge.input,
        })),
      );
    }
  }, [graph?.nodes, graph?.edges]);

  const handleConnect = useCallback<NonNullable<ReactFlowProps['onConnect']>>(
    (connection) => {
      // TODO(burdon): sourceHandle/targetHandle.
      log.info('handleConnect', { connection });
      if (graph && connection.source && connection.target) {
        graph.createEdge({
          source: connection.source,
          target: connection.target,
          output: connection.sourceHandle ?? undefined,
          input: connection.targetHandle ?? undefined,
        });
      }
    },
    [graph],
  );

  // const handleNodeDragStart = useCallback<NonNullable<ReactFlowProps['onNodeDragStart']>>((_event, node) => {
  //   console.log('onNodeDragStart', JSON.stringify(node, null, 2));
  // }, []);

  // const handleNodeDragMove = useCallback<NonNullable<ReactFlowProps['onNodeDrag']>>((_event, node) => {
  //   console.log('onNodeDrag', JSON.stringify(node, null, 2));
  // }, []);

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
    log.info('handleNodesDelete', { nodes });
  }, []);

  const handleEdgesDelete = useCallback<NonNullable<ReactFlowProps['onEdgesDelete']>>((edges) => {
    log.info('handleEdgesDelete', { edges });
  }, []);

  if (!graph) {
    return null;
  }

  const snap = 16;

  return (
    <ReactFlow
      className={mx('is-full bs-full', classNames)}
      colorMode={themeMode}
      edges={edges}
      fitView={true}
      fitViewOptions={{ maxZoom: 1 }}
      nodes={nodes}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
      snapGrid={[snap, snap]}
      snapToGrid={true}
      zoomOnScroll={false}
      onConnect={handleConnect}
      // onNodeDragStart={handleNodeDragStart}
      // onNodeDrag={handleNodeDragMove}
      onNodeDragStop={handleNodeDragStop}
      onNodesChange={handleNodesChange}
      onNodesDelete={handleNodesDelete}
      onEdgesChange={handleEdgesChange}
      onEdgesDelete={handleEdgesDelete}
    >
      {grid === 'grid' && (
        <>
          <Background
            id='grid-minor'
            gap={snap}
            className='[&>*>*.lines]:dark:!stroke-neutral-750 opacity-50'
            variant={BackgroundVariant.Lines}
          />
          <Background
            id='grid-major'
            gap={snap * 4}
            className='[&>*>*.lines]:dark:!stroke-neutral-700 opacity-50'
            variant={BackgroundVariant.Lines}
          />
        </>
      )}
      {grid === 'dots' && (
        <>
          <Background
            id='grid-minor'
            gap={snap}
            offset={[0.5, 0.5]}
            className='!bg-transparent [&>*>*.dots]:dark:!stroke-neutral-700'
            variant={BackgroundVariant.Dots}
          />
        </>
      )}
      {map && <MiniMap />}
      <Controls fitViewOptions={{ maxZoom: 1 }} showInteractive={false} />
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
