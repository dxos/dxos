//
// Copyright 2025 DXOS.org
//

import type { ComputeEdge, ComputeGraph } from '../types/compute-graph';

export const computeGraphToGraphViz = (graph: ComputeGraph): string => {
  const lines: string[] = [];
  lines.push('digraph G {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box];');
  lines.push('  graph [pad="0.5", nodesep="1", ranksep="1.5"];');

  // Add nodes
  for (const node of graph.graph.nodes) {
    lines.push(`  "${node.id}" [label="${node.type}"];`);
  }

  // Add edges with property labels
  // TODO(dmaretskyi): The types don't match!
  for (const edge of graph.graph.edges as ComputeEdge[]) {
    lines.push(`  "${edge.source}" -> "${edge.target}" [taillabel="${edge.output}" headlabel="${edge.input}"];`);
  }

  lines.push('}');
  return lines.join('\n');
};
