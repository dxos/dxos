//
// Copyright 2023 DXOS.org
//

import React, { createContext } from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { dataResolvers } from './data-resolver';
import { sessionGraph } from './session-graph';
import { SessionPluginProvides, SessionContext, SessionPluginParticipant } from './types';

const SessionContext = createContext<SessionContext>({ sessionGraph, dataResolvers });

export const SessionPlugin = (): PluginDefinition<SessionPluginProvides> => {
  return {
    meta: {
      id: 'dxos.org/plugin/session',
    },
    ready: async (plugins) => {
      plugins.forEach((plugin) => {
        if ('nodeDataResolver' in plugin.provides) {
          dataResolvers.push((plugin as SessionPluginParticipant).provides!.dataResolver);
        }
      });
    },
    provides: {
      context: ({ children }) => {
        return <SessionContext.Provider value={{ sessionGraph, dataResolvers }}>{children}</SessionContext.Provider>;
      },
      sessionGraph,
      dataResolvers,
    },
  };
};
