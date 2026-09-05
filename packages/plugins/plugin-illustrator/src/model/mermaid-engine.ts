//
// Copyright 2026 DXOS.org
//

//
// Engine-backed mermaid flowchart dialect: ELK lays out the graph as a compound graph (subgraphs
// are hierarchical nodes, so crossing minimization and placement respect containment), cells are
// uniform and grid-snapped like the UML grid dialect, and connectors take the shared
// obstacle-avoiding router. Parsing stays in `mermaid.ts`; see `docs/DESIGN.md`.
//

import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';

import * as Layout from './layout';
import { type Direction, type MermaidGraph, parse } from './mermaid';
import { makeAvoidingRouter } from './ortho-router';
import type * as Scene from './scene';
import { GRID, type Rect, type Router, zRouter } from './uml-grid';

const MIN_W = GRID * 3;
const MAX_W = GRID * 6;
const MIN_H = GRID * 2;
const PAD_X = GRID;
const PAD_Y = GRID / 2;
const GAP_MAIN = GRID * 3;
const GAP_CROSS = GRID * 2;
/** Frame inset around a subgraph's members; the top also holds the frame label. */
const FRAME_PAD = GRID;
const FRAME_LABEL_H = GRID;

const FONT = Layout.FONT_METRICS.m;
const LABEL_FONT = Layout.FONT_METRICS.s;

const ELK_DIRECTION: Record<Direction, string> = { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' };

const snap = (value: number) => Math.round(value / GRID) * GRID;
const snapUp = (value: number) => Math.ceil(value / GRID) * GRID;

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
  /** Gap between ranks along the flow direction, in scene units (default GRID × 3, snapped). */
  gapMain?: number;
  /** Gap between nodes within a rank, in scene units (default GRID × 2, snapped). */
  gapCross?: number;
  /** Maximum cell width, in scene units (default GRID × 6); longer labels wrap. */
  maxWidth?: number;
  /** Connector router (default: obstacle-avoiding A* with the Z-router as fallback). */
  route?: Router;
};

type Cell = { w: number; h: number };

/** One cell size for every node, sized to the longest label wrapped at `maxWidth`. */
const measureCell = (graph: MermaidGraph, maxWidth: number): Cell => {
  const longest = Math.max(0, ...graph.nodes.map((node) => node.label.length));
  const w = snapUp(Math.min(maxWidth, Math.max(MIN_W, longest * FONT.charW + PAD_X * 2)));
  const perLine = Math.max(1, Math.floor((w - PAD_X) / FONT.charW));
  const lines = Math.max(1, ...graph.nodes.map((node) => Math.ceil(node.label.length / perLine)));
  const h = snapUp(Math.max(MIN_H, (lines - 1) * FONT.lineH + FONT.lineH / 1.35 + PAD_Y * 2));
  return { w, h };
};

type Placement = {
  nodes: Map<string, Rect>;
  frames: Map<string, Rect>;
};

/**
 * ELK compound layout. Groups become hierarchical nodes whose children ELK lays out inside
 * them; positions come back parent-relative and are flattened here. Node rects are snapped to the
 * grid and frames recomputed from their snapped members, so snapping can never break containment.
 */
const place = async (
  graph: MermaidGraph,
  cell: Cell,
  { gapMain, gapCross }: { gapMain: number; gapCross: number },
): Promise<Placement> => {
  const grouped = new Set(graph.groups.flatMap((group) => group.children));
  const leaf = (id: string): ElkNode => ({ id, width: cell.w, height: cell.h });
  // Spacing is per compound node, not inherited: left unset, ELK packs a group's members at its
  // 20px default — inside the router's clearance — and every route through that group is fenced.
  const spacing = {
    'elk.layered.spacing.nodeNodeBetweenLayers': String(gapMain),
    'elk.spacing.nodeNode': String(gapCross),
  };
  const children: ElkNode[] = [
    ...graph.nodes.filter((node) => !grouped.has(node.id)).map((node) => leaf(node.id)),
    ...graph.groups
      .filter((group) => group.children.length > 0)
      .map((group) => ({
        id: group.id,
        layoutOptions: {
          ...spacing,
          'elk.padding': `[top=${FRAME_PAD + FRAME_LABEL_H},left=${FRAME_PAD},bottom=${FRAME_PAD},right=${FRAME_PAD}]`,
        },
        children: group.children.map(leaf),
      })),
  ];

  const elk = new ELK();
  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ELK_DIRECTION[graph.direction],
      // Lay out the whole hierarchy in one pass so edges crossing group borders still order layers.
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      ...spacing,
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.considerModelOrder.strategy': 'PREFER_NODES',
    },
    children,
    edges: graph.edges.map((edge, index) => ({ id: `edge-${index}`, sources: [edge.from], targets: [edge.to] })),
  });

  const nodes = new Map<string, Rect>();
  const visit = (node: ElkNode, offset: Scene.Point) => {
    for (const child of node.children ?? []) {
      const x = offset.x + (child.x ?? 0);
      const y = offset.y + (child.y ?? 0);
      if (child.children?.length) {
        visit(child, { x, y });
      } else {
        nodes.set(child.id, { x: snap(x), y: snap(y), w: cell.w, h: cell.h });
      }
    }
  };
  visit(result, { x: 0, y: 0 });

  // Normalize to a zero origin.
  const minX = Math.min(0, ...[...nodes.values()].map((rect) => rect.x));
  const minY = Math.min(0, ...[...nodes.values()].map((rect) => rect.y));
  for (const [id, rect] of nodes) {
    nodes.set(id, { ...rect, x: rect.x - minX, y: rect.y - minY });
  }

  const frames = new Map<string, Rect>();
  for (const group of graph.groups) {
    const members = group.children.flatMap((id) => nodes.get(id) ?? []);
    if (members.length === 0) {
      continue;
    }
    const x = Math.min(...members.map((rect) => rect.x)) - FRAME_PAD;
    const y = Math.min(...members.map((rect) => rect.y)) - FRAME_PAD - FRAME_LABEL_H;
    const right = Math.max(...members.map((rect) => rect.x + rect.w)) + FRAME_PAD;
    const bottom = Math.max(...members.map((rect) => rect.y + rect.h)) + FRAME_PAD;
    frames.set(group.id, { x, y, w: right - x, h: bottom - y });
  }

  return { nodes, frames };
};

/**
 * Compile a mermaid flowchart with ELK compound placement: one world object per subgraph frame
 * (painted first) and per node, plus an `edges` object of routed connectors. Async because ELK is.
 */
export const compile = async (source: string, options: CompileOptions = {}): Promise<Scene.Command[]> => {
  const graph = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1, maxWidth = MAX_W } = options;
  const cell = measureCell(graph, maxWidth);
  const { nodes, frames } = await place(graph, cell, {
    gapMain: snap(options.gapMain ?? GAP_MAIN),
    gapCross: snap(options.gapCross ?? GAP_CROSS),
  });
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';
  const at = (rect: Rect): Scene.Point => ({ x: origin.x + rect.x * scale, y: origin.y + rect.y * scale });

  const commands: Scene.Command[] = [];

  for (const group of graph.groups) {
    const frame = frames.get(group.id);
    if (!frame) {
      continue;
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: group.id,
        origin: at(frame),
        scale,
        elements: [
          { kind: 'rect', id: 'frame', x: 0, y: 0, w: frame.w, h: frame.h, stroke: 'dashed', color: 'grey' },
          // The label sits in the frame's top band rather than centered, where members would cover it.
          ...(group.label.trim()
            ? [
                {
                  kind: 'text',
                  id: 'label',
                  x: FRAME_PAD / 2,
                  y: (FRAME_LABEL_H - LABEL_FONT.lineH) / 2,
                  text: group.label,
                  weight: 's',
                  color: 'grey',
                } satisfies Scene.Text,
              ]
            : []),
        ],
      },
    });
  }

  for (const node of graph.nodes) {
    const rect = nodes.get(node.id);
    if (!rect) {
      continue;
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: node.id,
        origin: at(rect),
        scale,
        ...(node.ref ? { ref: node.ref } : {}),
        elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: cell.w, h: cell.h, text: node.label }],
      },
    });
  }

  if (graph.edges.length > 0) {
    // Frames are containers, not obstacles: only node rects block routes.
    const router = options.route ?? makeAvoidingRouter([...nodes.values()], zRouter);
    const elements: Scene.Element[] = [];
    graph.edges.forEach((edge, index) => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) {
        return;
      }
      const points = router({ relation: edge, from, to, horizontal, offset: 0 });
      const id = `${edge.from}-${edge.to}-${index}`;
      if (points.length > 2) {
        elements.push({ kind: 'line', id: `${id}-path`, points: points.slice(0, -1) });
      }
      elements.push({ kind: 'arrow', id, start: points[points.length - 2], end: points[points.length - 1] });
      if (edge.label) {
        const head = points[Math.floor(points.length / 2) - 1];
        const tail = points[Math.floor(points.length / 2)];
        elements.push({
          kind: 'text',
          id: `${id}-label`,
          x: (head.x + tail.x) / 2 + GRID / 4,
          y: (head.y + tail.y) / 2 - LABEL_FONT.lineH,
          text: edge.label,
          weight: 's',
        });
      }
    });
    commands.push({ op: 'upsert-object', object: { id: 'edges', origin, scale, elements } });
  }

  return commands;
};
