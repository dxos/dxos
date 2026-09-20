//
// Copyright 2026 DXOS.org
//

//
// Dynamic projection (§3 variant 3): the model is an external graph of nodes and edges. A layout
// engine ranks it into rows; an overlay of user overrides applies on top, so a `move` intent writes
// an override rather than a coordinate, graph edits re-run the engine, and an override whose node
// vanished is dropped.
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { Layout } from '@dxos/diagram';

import { initialKeys } from '../order.ts';
import { type Projection } from '../projection.ts';
import { type Capabilities, type Cell, type Intent, type Point, type Scene, type Size } from '../types.ts';

export type GraphNode = { id: string; label?: string };
export type GraphEdge = { id: string; from: string; to: string };

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/** User adjustments layered over the engine's layout (react-ui-diagram's pattern). */
export type Overlay = {
  positions: Record<string, Point>;
};

export type DynamicOptions = {
  pitch?: Size;
  size?: Size;
  origin?: Point;
};

/** Multiples of the major grid, so a laid-out graph is already snapped. */
const DEFAULTS: Required<DynamicOptions> = {
  pitch: { width: 256, height: 192 },
  size: { width: 192, height: 128 },
  origin: { x: 160, y: 128 },
};

export const DYNAMIC_SCENE_ID = 'dynamic';

/** Rank rows top-down along the edges; columns are the order within a row. Overrides win. */
export const layoutGraph = (graph: GraphModel, overlay: Overlay, options: DynamicOptions = {}): Scene => {
  const { pitch, size, origin } = { ...DEFAULTS, ...options };
  const ids = graph.nodes.map(({ id }) => id);
  const known = new Set(ids);
  const ranks = Layout.rank(
    ids,
    graph.edges.filter(({ from, to }) => known.has(from) && known.has(to)),
  );
  const byRow = new Map<number, string[]>();
  for (const id of ids) {
    const row = ranks.get(id) ?? 0;
    byRow.set(row, [...(byRow.get(row) ?? []), id]);
  }
  const columns = new Map<string, number>();
  for (const members of byRow.values()) {
    [...members].sort().forEach((id, index) => columns.set(id, index));
  }

  const keys = initialKeys(graph.nodes.length + graph.edges.length);
  const cells: Record<string, Cell> = {};
  graph.nodes.forEach((node, index) => {
    const override = overlay.positions[node.id];
    cells[node.id] = {
      kind: 'rect',
      id: node.id,
      z: keys[graph.edges.length + index],
      center: override ?? {
        x: origin.x + (columns.get(node.id) ?? 0) * pitch.width,
        y: origin.y + (ranks.get(node.id) ?? 0) * pitch.height,
      },
      size,
      label: node.label ?? node.id,
    };
  });
  graph.edges.forEach((edge, index) => {
    if (known.has(edge.from) && known.has(edge.to)) {
      cells[edge.id] = {
        kind: 'link',
        id: edge.id,
        z: keys[index],
        source: { cell: edge.from },
        target: { cell: edge.to },
      };
    }
  });
  return { id: DYNAMIC_SCENE_ID, name: 'Dynamic', cells };
};

/** Drop overrides whose nodes are gone. */
export const pruneOverlay = (graph: GraphModel, overlay: Overlay): Overlay => {
  const known = new Set(graph.nodes.map(({ id }) => id));
  const positions = Object.fromEntries(Object.entries(overlay.positions).filter(([id]) => known.has(id)));
  return Object.keys(positions).length === Object.keys(overlay.positions).length ? overlay : { positions };
};

export const dynamicCapabilities: Capabilities = { move: true, link: true, delete: true, update: true };

export type DynamicProjectionOptions = {
  registry: Registry.AtomRegistry;
  graph: Atom.Writable<GraphModel>;
  overlay: Atom.Writable<Overlay>;
  options?: DynamicOptions;
};

export const createDynamicProjection = ({
  registry,
  graph,
  overlay,
  options,
}: DynamicProjectionOptions): Projection => {
  const scene = Atom.keepAlive(
    Atom.make((get) => layoutGraph(get(graph), pruneOverlay(get(graph), get(overlay)), options)),
  );
  const apply = (intent: Intent) => {
    switch (intent.kind) {
      case 'move': {
        const current = registry.get(scene);
        const positions = { ...registry.get(overlay).positions };
        for (const id of intent.ids) {
          const cell = current.cells[id];
          if (cell && cell.kind !== 'link') {
            positions[id] = { x: cell.center.x + intent.delta.x, y: cell.center.y + intent.delta.y };
          }
        }
        registry.set(overlay, { positions });
        break;
      }
      case 'link': {
        const model = registry.get(graph);
        if (model.edges.some((edge) => edge.id === intent.id)) {
          return;
        }
        registry.set(graph, {
          ...model,
          edges: [...model.edges, { id: intent.id, from: intent.source.cell, to: intent.target.cell }],
        });
        break;
      }
      case 'delete': {
        const ids = new Set(intent.ids);
        const model = registry.get(graph);
        registry.set(graph, {
          nodes: model.nodes.filter(({ id }) => !ids.has(id)),
          edges: model.edges.filter(({ id, from, to }) => !ids.has(id) && !ids.has(from) && !ids.has(to)),
        });
        break;
      }
      case 'update': {
        // The label is the graph's; a geometry edit becomes an override like a move would.
        const model = registry.get(graph);
        if (intent.values.kind === 'rect' && typeof intent.values.label === 'string') {
          const label = intent.values.label;
          registry.set(graph, {
            ...model,
            nodes: model.nodes.map((node) => (node.id === intent.id ? { ...node, label } : node)),
          });
        }
        if ('center' in intent.values && intent.values.center) {
          const center = intent.values.center;
          registry.set(overlay, { positions: { ...registry.get(overlay).positions, [intent.id]: center } });
        }
        break;
      }
      default:
        break;
    }
  };
  return { scene, apply, capabilities: dynamicCapabilities };
};
