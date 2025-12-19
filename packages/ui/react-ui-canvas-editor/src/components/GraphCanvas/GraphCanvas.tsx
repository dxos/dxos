//
// Copyright 2024 DXOS.org
//

import {
  Background,
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

import './styles.css';

const nodeTypes: NodeTypes = {
  custom: GraphNode,
};

export type GraphCanvasProps = ThemedClassName<React.PropsWithChildren> & {
  graph?: CanvasGraphModel;
};

const GraphCanvasInner = ({ children, classNames, graph: propsGraph }: GraphCanvasProps) => {
  const { themeMode } = useThemeContext();
  const context = useContext(EditorContext);
  const graph = propsGraph ?? context?.graph;

  if (!graph) {
    return null;
  }

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
    <div className={mx('is-full bs-full', classNames)}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} colorMode={themeMode} fitView>
        <Background />
        <Controls />
        {children}
      </ReactFlow>
    </div>
  );
};

export const GraphCanvas = (props: GraphCanvasProps) => (
  <ReactFlowProvider>
    <GraphCanvasInner {...props} />
  </ReactFlowProvider>
);
