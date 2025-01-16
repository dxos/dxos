//
// Copyright 2023 DXOS.org
//

import React, { type Context, createContext, type PropsWithChildren, useContext } from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';
import { type GraphBuilder } from '@dxos/app-graph';
import { raise } from '@dxos/debug';

import { GRAPH_PLUGIN } from './meta';

type GraphContextType = Pick<GraphBuilder, 'graph' | 'explore'>;
const GraphContext: Context<GraphContextType | null> = createContext<GraphContextType | null>(null);

export const useGraph = (): GraphContextType => useContext(GraphContext) ?? raise(new Error('Missing GraphContext'));

export default () =>
  contributes(Capabilities.ReactContext, {
    id: GRAPH_PLUGIN,
    context: (props: PropsWithChildren) => {
      const value = useCapability(Capabilities.AppGraph);
      return <GraphContext.Provider value={value}>{props.children}</GraphContext.Provider>;
    },
  });
