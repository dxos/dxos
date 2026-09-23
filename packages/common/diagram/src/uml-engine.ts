//
// Copyright 2026 DXOS.org
//

//
// Engine-backed placement for the grid UML dialect: dagre or ELK replace the hand-rolled
// lane/column pass (proper crossing minimization and straightness-seeking coordinate
// assignment), while parsing, cell measurement, grid snapping, routing, and emission stay
// shared with `uml-grid.ts`. See `docs/DESIGN.md`.
//

import { layout as dagreLayout, graphlib } from '@dagrejs/dagre';
import ELK from 'elkjs/lib/elk.bundled.js';

import type * as Scene from './scene.ts';
import {
  type Cell,
  GRID,
  type CompileOptions as GridCompileOptions,
  type Rect,
  emit,
  measureCell,
} from './uml-grid.ts';
import { type Direction, type UmlModel, parse, relationRanks } from './uml.ts';

export type Engine = 'dagre' | 'elk';

export type CompileOptions = Omit<GridCompileOptions, 'route'> & {
  /** Placement engine (default 'elk'). */
  engine?: Engine;
};

const GAP_MAIN = GRID * 4;
const GAP_CROSS = GRID * 4;

const snap = (value: number) => Math.round(value / GRID) * GRID;

type PlaceOptions = {
  cell: Cell;
  gapMain: number;
  gapCross: number;
  direction: Direction;
};

const DAGRE_DIRECTION: Record<Direction, string> = { TB: 'TB', BT: 'BT', LR: 'LR', RL: 'RL' };
const ELK_DIRECTION: Record<Direction, string> = { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' };

/**
 * Edges oriented for layering: inheritance, realization, and dependency point at abstractions,
 * which rank ABOVE their sources — so those edges are reversed for the engine (which lays out
 * source-above-target), matching `relationRanks`.
 */
const orientedEdges = (model: UmlModel): { from: string; to: string }[] =>
  model.relations.map((relation) =>
    relation.kind === 'inheritance' || relation.kind === 'realization' || relation.kind === 'dependency'
      ? { from: relation.to, to: relation.from }
      : { from: relation.from, to: relation.to },
  );

/** Snap engine output to the document grid and normalize the top-left to (0, 0). */
const snapRects = (rects: Map<string, Rect>): Map<string, Rect> => {
  const snapped = new Map([...rects].map(([id, rect]) => [id, { ...rect, x: snap(rect.x), y: snap(rect.y) }]));
  const minX = Math.min(...[...snapped.values()].map((rect) => rect.x), 0);
  const minY = Math.min(...[...snapped.values()].map((rect) => rect.y), 0);
  return new Map([...snapped].map(([id, rect]) => [id, { ...rect, x: rect.x - minX, y: rect.y - minY }]));
};

/** dagre: network-simplex layering + median-sweep crossing minimization. Sync. */
const dagrePlace = (model: UmlModel, { cell, gapMain, gapCross, direction }: PlaceOptions): Map<string, Rect> => {
  const graph = new graphlib.Graph();
  graph.setGraph({
    rankdir: DAGRE_DIRECTION[direction],
    ranker: 'network-simplex',
    ranksep: gapMain,
    nodesep: gapCross,
    edgesep: gapCross / 2,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const entry of model.classes) {
    graph.setNode(entry.id, { width: cell.w, height: cell.h });
  }
  for (const edge of orientedEdges(model)) {
    graph.setEdge(edge.from, edge.to);
  }
  dagreLayout(graph);

  // dagre reports node centers.
  const rects = new Map<string, Rect>(
    model.classes.map((entry) => {
      const node = graph.node(entry.id);
      return [entry.id, { x: node.x - cell.w / 2, y: node.y - cell.h / 2, w: cell.w, h: cell.h }];
    }),
  );
  return snapRects(rects);
};

/** ELK layered: layer-sweep crossing minimization + Brandes-Köpf placement. Async. */
const elkPlace = async (
  model: UmlModel,
  { cell, gapMain, gapCross, direction }: PlaceOptions,
): Promise<Map<string, Rect>> => {
  const elk = new ELK();
  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ELK_DIRECTION[direction],
      'elk.layered.spacing.nodeNodeBetweenLayers': String(gapMain),
      'elk.spacing.nodeNode': String(gapCross),
      // Favors long straight chains over balanced centering — fewer jagged connectors.
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      // Keeps declaration order among otherwise-unconstrained siblings, so peers stay gathered.
      'elk.layered.considerModelOrder.strategy': 'PREFER_NODES',
    },
    children: model.classes.map((entry) => ({ id: entry.id, width: cell.w, height: cell.h })),
    edges: orientedEdges(model).map((edge, index) => ({
      id: `edge-${index}`,
      sources: [edge.from],
      targets: [edge.to],
    })),
  });

  const rects = new Map<string, Rect>(
    (result.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0, w: cell.w, h: cell.h }]),
  );
  return snapRects(rects);
};

/**
 * Compile a mermaid class diagram with engine-backed placement; identical output structure to
 * `UmlGrid.compile` (equal-size grid cells, orthogonal Z-routed connectors), but node positions
 * come from dagre/ELK. Async because ELK is.
 */
export const compile = async (source: string, options: CompileOptions = {}): Promise<Scene.Command[]> => {
  const { origin, scale, maxWidth = GRID * 6, engine = 'elk' } = options;
  const model = parse(source);
  const cell = measureCell(model, { maxWidth, cell: options.cell, titleHeight: options.titleHeight });
  const place: PlaceOptions = {
    cell,
    gapMain: snap(options.gapMain ?? GAP_MAIN),
    gapCross: snap(options.gapCross ?? GAP_CROSS),
    direction: model.direction,
  };
  const rects = engine === 'dagre' ? dagrePlace(model, place) : await elkPlace(model, place);
  return emit({ model, cell, rects, ranks: relationRanks(model) }, { origin, scale });
};
