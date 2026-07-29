//
// Copyright 2026 DXOS.org
//

import '@xyflow/react/dist/base.css';

import {
  Background,
  BackgroundVariant,
  type Edge as FlowEdge,
  type Node as FlowNode,
  MarkerType,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import React, { useEffect, useMemo } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { layout } from '../../model';
import { type Node, type Overlay, type Point, type Projection, isGroup } from '../../types';
import { DiagramGroup, DiagramNode } from './DiagramNode';

const SNAP = 8;

const nodeTypes: NodeTypes = {
  node: DiagramNode,
  group: DiagramGroup,
};

export type DiagramProps = ThemedClassName<{
  diagram: Projection;
  overlay?: Overlay;
  grid?: 'lines' | 'dots' | false;
  /** Emitted when a node is dragged; the caller decides whether it pins to the overlay. */
  onNodeMove?: (id: string, origin: Point) => void;
}>;

/**
 * Renders the neutral diagram model. Controlled: the model is authoritative and this is a
 * projection of it, so the canvas can never hold state the model does not describe.
 */
const DiagramImpl = ({ classNames, diagram, overlay, grid = 'dots', onNodeMove }: DiagramProps) => {
  const { themeMode } = useThemeContext();
  const { fitView } = useReactFlow();

  const resolved = useMemo(() => layout(diagram.graph, { overlay }), [diagram, overlay]);

  const nodes = useMemo<FlowNode[]>(
    () =>
      resolved.nodes.map((node: Node) => {
        const group = isGroup(node);
        return {
          id: node.id,
          type: group ? 'group' : 'node',
          position: node.origin ?? { x: 0, y: 0 },
          data: { node },
          ...(node.parent ? { parentId: node.parent, extent: 'parent' as const } : {}),
          // Groups paint behind their children so they do not cover them.
          ...(group ? { zIndex: 0 } : {}),
          style: node.size ? { width: node.size.width, height: node.size.height } : undefined,
        };
      }),
    [resolved],
  );

  const edges = useMemo<FlowEdge[]>(
    () =>
      resolved.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourcePort ?? null,
        targetHandle: edge.targetPort ?? null,
        label: edge.label,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [resolved],
  );

  // Refit when the projection changes shape, otherwise editing the source scrolls the diagram
  // out of view.
  useEffect(() => {
    const handle = setTimeout(() => fitView({ maxZoom: 1, padding: 0.2 }), 0);
    return () => clearTimeout(handle);
  }, [resolved.nodes.length, resolved.edges.length, fitView]);

  return (
    <ReactFlow
      className={mx('dx-expander', classNames)}
      colorMode={themeMode}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      snapToGrid={true}
      snapGrid={[SNAP, SNAP]}
      fitView={true}
      fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
      nodesConnectable={false}
      onNodeDragStop={(_event, node) => onNodeMove?.(node.id, node.position)}
    >
      {grid && (
        <Background gap={SNAP * 2} variant={grid === 'lines' ? BackgroundVariant.Lines : BackgroundVariant.Dots} />
      )}
    </ReactFlow>
  );
};

export const Diagram = (props: DiagramProps) => (
  <ReactFlowProvider>
    <DiagramImpl {...props} />
  </ReactFlowProvider>
);
