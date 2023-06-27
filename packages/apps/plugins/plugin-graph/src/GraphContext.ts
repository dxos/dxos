// TODO(wittjosiah): State can be a GraphNode.
//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { GraphContextValue } from './types';

export const GraphContext: Context<GraphContextValue> = createContext<GraphContextValue>({ roots: {}, actions: {} });

export const useGraphContext = () => useContext(GraphContext);
