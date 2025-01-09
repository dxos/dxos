//
// Copyright 2023 DXOS.org
//

import React, { type Context, createContext, type PropsWithChildren, useContext } from 'react';

import { Capabilities, contributes, useCapabilities } from '@dxos/app-framework/next';
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
      const [value] = useCapabilities(Capabilities.AppGraph);
      return <GraphContext.Provider value={value}>{props.children}</GraphContext.Provider>;
    },
  });
