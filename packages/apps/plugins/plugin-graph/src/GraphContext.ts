//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): State can be a GraphNode.
import { type Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type GraphContextValue } from './types';

export const GraphContext: Context<GraphContextValue | null> = createContext<GraphContextValue | null>(null);

export const useGraph = (): GraphContextValue => useContext(GraphContext) ?? raise(new Error('Missing GraphContext'));
