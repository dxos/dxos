//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { defaultSessionContextValue, SessionContext } from './SessionContext';
import { dataResolvers } from './data-resolver';
import { sessionGraph } from './session-graph';
import { SessionPluginProvides, SessionPluginParticipant } from './types';

export const SessionPlugin = (): PluginDefinition<SessionPluginProvides> => {
  return {
    meta: {
      id: 'dxos.org/plugin/session',
    },
    ready: async (plugins) => {
      plugins.forEach((plugin) => {
        if ('nodeDataResolver' in plugin.provides) {
          dataResolvers.push(
            (plugin as PluginDefinition<SessionPluginParticipant>).provides!.session.resolver(plugins),
          );
        }
      });
    },
    provides: {
      context: ({ children }) => (
        <SessionContext.Provider value={defaultSessionContextValue}>{children}</SessionContext.Provider>
      ),
      sessionGraph,
      dataResolvers,
    },
  };
};
