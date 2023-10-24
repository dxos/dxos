//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): State can be a GraphNode.
import { type Context, createContext, useContext } from 'react';

import { type Graph } from '@dxos/app-graph';
import { raise } from '@dxos/debug';

export type GraphContext = { graph: Graph };

export const GraphContext: Context<GraphContext | null> = createContext<GraphContext | null>(null);

export const useGraph = (): GraphContext => useContext(GraphContext) ?? raise(new Error('Missing GraphContext'));
