//
// Copyright 2026 DXOS.org
//

//
// Shared layered-layout helpers for dialects that compile edge lists without coordinates
// (mermaid flowchart, UML class). Ranking is longest-path over the forward edges; cycles are
// broken by ignoring DFS back edges so a loop cannot push a node below its own successors.
//

import type * as Scene from './scene.ts';

export type LayoutEdge = {
  from: string;
  to: string;
};

export type FontMetrics = {
  /** Average glyph advance, in scene units at scale 1. */
  charW: number;
  /** Line height, in scene units at scale 1. */
  lineH: number;
};

/**
 * Empirical text metrics per scene weight, calibrated to tldraw's draw font (`size` s/m/l/xl runs
 * ~18/25/38/48 px): charW ≈ 0.6–0.67 em, lineH ≈ 1.35 em. Dialects size boxes from these so text
 * fits without the renderer growing shapes over their neighbours.
 */
export const FONT_METRICS: Record<Scene.Weight, FontMetrics> = {
  s: { charW: 12, lineH: 26 },
  m: { charW: 15, lineH: 34 },
  l: { charW: 23, lineH: 51 },
  xl: { charW: 29, lineH: 65 },
};

/**
 * Edges that close a cycle, found by DFS: an edge into a node still on the stack points backwards.
 * Ranking ignores them, so `C --> Y --> C` ranks C by its forward predecessors alone instead of
 * chasing the loop.
 */
export const backEdges = <Edge extends LayoutEdge>(nodeIds: readonly string[], edges: readonly Edge[]): Set<Edge> => {
  const outgoing = new Map<string, Edge[]>();
  for (const edge of edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
  }

  const back = new Set<Edge>();
  const done = new Set<string>();
  const onStack = new Set<string>();

  const visit = (id: string) => {
    onStack.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (onStack.has(edge.to)) {
        back.add(edge);
      } else if (!done.has(edge.to)) {
        visit(edge.to);
      }
    }
    onStack.delete(id);
    done.add(id);
  };

  // Roots first so the DFS classifies edges along the natural reading order of the diagram.
  const targets = new Set(edges.map((edge) => edge.to));
  for (const id of nodeIds) {
    if (!targets.has(id) && !done.has(id)) {
      visit(id);
    }
  }
  for (const id of nodeIds) {
    if (!done.has(id)) {
      visit(id);
    }
  }
  return back;
};

/** Assign each node a rank one past its deepest forward predecessor. */
export const rank = (nodeIds: readonly string[], edges: readonly LayoutEdge[]): Map<string, number> => {
  const back = backEdges(nodeIds, edges);
  const forward = edges.filter((edge) => !back.has(edge));
  const ranks = new Map(nodeIds.map((id) => [id, 0]));
  for (let pass = 0; pass < nodeIds.length; pass++) {
    let changed = false;
    for (const edge of forward) {
      const next = (ranks.get(edge.from) ?? 0) + 1;
      if (next > (ranks.get(edge.to) ?? 0)) {
        ranks.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return ranks;
};
