//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { createContext, useContext } from 'react';

import { Plugin, PluginDefinition, findPlugin } from '@dxos/react-surface';

export const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = deepSignal<{ sendIntent: (intent: Intent) => void }>({ sendIntent: () => {} });

  return {
    meta: {
      id: 'dxos:intent',
    },
    ready: async (plugins) => {
      state.sendIntent = (intent: Intent) => {
        const plugin = intent.plugin && findPlugin<IntentProvides>(plugins, intent.plugin);
        if (plugin) {
          return plugin.provides.intent.resolver(intent, plugins);
        }

        return intentPlugins(plugins).reduce((acc, plugin) => {
          if (acc) {
            return acc;
          }

          return plugin.provides.intent.resolver(intent, plugins);
        }, null);
      };
    },
    provides: {
      context: ({ children }) => (
        <IntentContext.Provider value={{ sendIntent: state.sendIntent }}>{children}</IntentContext.Provider>
      ),
      intent: state,
    },
  };
};

export type IntentPluginProvides = {
  intent: {
    sendIntent: (intent: Intent) => void;
  };
};

export type Intent = {
  plugin?: string;
  action: string;
  data?: any;
};

export type IntentContextValue = {
  sendIntent: (intent: Intent) => void;
};

const IntentContext = createContext<IntentContextValue>({ sendIntent: () => {} });

export const useIntent = () => useContext(IntentContext);

export type IntentProvides = {
  intent: {
    resolver: (intent: Intent, plugins: Plugin[]) => any;
  };
};

type IntentPlugin = Plugin<IntentProvides>;
const intentPlugins = (plugins: Plugin[]): IntentPlugin[] =>
  (plugins as IntentPlugin[]).filter((p) => typeof p.provides?.intent?.resolver === 'function');
