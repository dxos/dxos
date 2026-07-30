//
// Copyright 2026 DXOS.org
//

import '@xyflow/react/dist/base.css';

import { createContext } from '@radix-ui/react-context';
import {
  Background as BackgroundPrimitive,
  BackgroundVariant,
  type Edge as FlowEdge,
  type Node as FlowNode,
  MarkerType,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import React, { type FC, type PropsWithChildren, useCallback, useEffect, useMemo } from 'react';

import { composable, composableProps, useThemeContext } from '@dxos/react-ui';
import { type ComposableProps } from '@dxos/ui-types';

import { GRID, layout } from '../../model';
import { type Node, type Overlay, type Point, type Projection, isGroup } from '../../types';
import { DiagramGroup, DiagramNode } from './DiagramNode';

/**
 * Flow type keys, deliberately not `input`/`default`/`output`/`group`: React Flow styles those four
 * built-in names with `border: var(--xy-node-border)`, which lands on the *wrapper*. A container
 * registered as `group` therefore renders its own border 1px inset and 2px smaller than its declared
 * size, putting the right and bottom edges off the grid while left and top stay on it.
 */
const NODE_TYPE = 'node';
const CONTAINER_TYPE = 'container';

const nodeTypes: NodeTypes = {
  [NODE_TYPE]: DiagramNode,
  [CONTAINER_TYPE]: DiagramGroup,
};

//
// Root
//

type DiagramContextValue = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  grid: number;
  onNodesChange: ReturnType<typeof useNodesState<FlowNode>>[2];
  onEdgesChange: ReturnType<typeof useEdgesState<FlowEdge>>[2];
  onNodeMove?: (id: string, origin: Point) => void;
  /** Node count and edge count, so a refit is triggered by shape rather than by every keystroke. */
  shape: string;
};

const [DiagramProvider, useDiagramContext] = createContext<DiagramContextValue>('Diagram.Root');

export type DiagramRootProps = PropsWithChildren<{
  diagram: Projection;
  overlay?: Overlay;
  grid?: number;
  /** Emitted when a node is dragged; the caller decides whether it pins to the overlay. */
  onNodeMove?: (id: string, origin: Point) => void;
}>;

/**
 * Resolves the projection into a laid-out flow graph and provides it. Renders no element of its own,
 * so it can wrap whichever region of the surrounding layout owns the canvas.
 */
const DiagramRoot = ({ children, diagram, overlay, grid = GRID, onNodeMove }: DiagramRootProps) => {
  const resolved = useMemo(() => layout(diagram.graph, { overlay, grid }), [diagram, overlay, grid]);

  const projectedNodes = useMemo<FlowNode[]>(
    () =>
      resolved.nodes.map((node: Node) => {
        const group = isGroup(node);
        return {
          id: node.id,
          type: group ? CONTAINER_TYPE : NODE_TYPE,
          position: node.origin ?? { x: 0, y: 0 },
          data: { node },
          ...(node.parent ? { parentId: node.parent, extent: 'parent' as const } : {}),
          // Groups paint behind their children so they do not cover them.
          ...(group ? { zIndex: 0 } : {}),
          // `width`/`height` rather than only `style`: `extent: 'parent'` clamps a child against its
          // parent's measured size, and an unmeasured parent clamps every child to its origin. The
          // local mirror sets nodes once per projection, so that collapse would never self-correct.
          ...(node.size ? { width: node.size.width, height: node.size.height } : {}),
          style: node.size ? { width: node.size.width, height: node.size.height } : undefined,
        };
      }),
    [resolved],
  );

  const projectedEdges = useMemo<FlowEdge[]>(
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

  // Local mirror of the projection. React Flow owns the interim state of a gesture — a drag is a
  // stream of position changes it expects to apply itself — so without this a dragged node stays
  // frozen until the pointer is released. The model stays authoritative: the mirror is reset from
  // the projection whenever that changes, and a finished drag is committed through `onNodeMove`.
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  useEffect(() => setNodes(projectedNodes), [projectedNodes, setNodes]);
  useEffect(() => setEdges(projectedEdges), [projectedEdges, setEdges]);

  return (
    <ReactFlowProvider>
      <DiagramProvider
        nodes={nodes}
        edges={edges}
        grid={grid}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMove={onNodeMove}
        shape={`${resolved.nodes.length}:${resolved.edges.length}`}
      >
        {children}
      </DiagramProvider>
    </ReactFlowProvider>
  );
};

DiagramRoot.displayName = 'Diagram.Root';

//
// Canvas
//

export type DiagramCanvasProps = ComposableProps<PropsWithChildren>;

/** The pannable, zoomable surface. Controlled — every node and edge comes from the projection. */
const DiagramCanvas = composable<HTMLDivElement, PropsWithChildren>(({ children, ...props }, forwardedRef) => {
  const { themeMode } = useThemeContext();
  const { fitView } = useReactFlow();
  const { nodes, edges, grid, onNodesChange, onEdgesChange, onNodeMove, shape } = useDiagramContext('Diagram.Canvas');

  // Refit when the projection changes shape, otherwise editing the source scrolls the diagram out
  // of view. Keyed on counts so a drag does not refit under the pointer.
  useEffect(() => {
    const handle = setTimeout(() => fitView({ maxZoom: 1, padding: 0.2 }), 0);
    return () => clearTimeout(handle);
  }, [shape, fitView]);

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: FlowNode) => onNodeMove?.(node.id, node.position),
    [onNodeMove],
  );

  return (
    <ReactFlow
      {...composableProps(props, { classNames: 'dx-expander' })}
      ref={forwardedRef}
      colorMode={themeMode}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      snapToGrid={true}
      snapGrid={[grid, grid]}
      fitView={true}
      fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
      nodesConnectable={false}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={handleNodeDragStop}
    >
      {children}
    </ReactFlow>
  );
});

DiagramCanvas.displayName = 'Diagram.Canvas';

//
// Background
//

export type DiagramBackgroundProps = { variant?: 'lines' | 'dots' };

const VARIANT: Record<NonNullable<DiagramBackgroundProps['variant']>, BackgroundVariant> = {
  lines: BackgroundVariant.Lines,
  dots: BackgroundVariant.Dots,
};

/** Dot diameter in grid units. Passed explicitly so the offset below cannot drift from the default. */
const DOT_SIZE = 1;

/**
 * Grid overlay, drawn at the snap pitch so nodes visibly sit on the gridlines they snap to.
 *
 * Neither of React Flow's patterns is anchored to the cell corner, and each is wrong differently, so
 * `offset` has to compensate per variant:
 *
 * - `DotPattern` renders `circle cx=r cy=r`, putting the dot's centre `size * zoom / 2` inside the
 *   corner. The error scales with zoom, so it is invisible at 1 and obvious when zoomed in.
 * - `LinePattern` renders `M w/2 0 V h M0 h/2 H w`, drawing at the half-cell — a full `grid / 2` out.
 *
 * The leading `grid` term is a whole cell, a no-op once the pattern tiles, and keeps `offset`
 * non-zero: React Flow computes `offset * zoom || 1 + gap / 2`, so a zero offset is falsy and falls
 * through to a half-cell-plus-a-pixel shift.
 *
 * Not `composable`: Background is a memoized plain component with no ref to forward.
 */
const DiagramBackground: FC<DiagramBackgroundProps> = ({ variant = 'dots' }) => {
  const { grid } = useDiagramContext('Diagram.Background');
  const offset = variant === 'dots' ? grid + DOT_SIZE / 2 : grid + grid / 2;
  return <BackgroundPrimitive gap={grid} size={DOT_SIZE} offset={offset} variant={VARIANT[variant]} />;
};

DiagramBackground.displayName = 'Diagram.Background';

//
// Diagram
//

export const Diagram = {
  Root: DiagramRoot,
  Canvas: DiagramCanvas,
  Background: DiagramBackground,
};
