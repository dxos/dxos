//
// Copyright 2025 DXOS.org
//

import { createEdgeId, type GraphEdge } from '@dxos/graph';

import type { ComputeEdge } from '../schema';

export const createEdge = (params: {
  source: string;
  output: string;
  target: string;
  input: string;
}): GraphEdge<ComputeEdge> => ({
  id: createEdgeId({ source: params.source, target: params.target, relation: `${params.input}-${params.output}` }),
  source: params.source,
  target: params.target,
  data: { input: params.input, output: params.output },
});
