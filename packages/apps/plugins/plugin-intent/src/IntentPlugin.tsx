//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import Mousetrap from 'mousetrap';
import React from 'react';

import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import {
  DispatchIntent,
  Intent,
  IntentContextProvider,
  IntentPluginProvides,
  IntentProvides,
  filterPlugins,
} from './types';

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 * Inspired by https://developer.android.com/reference/android/content/Intent.
 */
export const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = deepSignal<{ dispatch: DispatchIntent }>({ dispatch: async () => {} });

  return {
    meta: {
      id: 'dxos.org/plugin/intent',
    },
    ready: async (plugins) => {
      // Dispatch intent to associated plugin.
      const dispatch = (intent: Intent) => {
        const plugin = intent.plugin && findPlugin<IntentProvides>(plugins, intent.plugin);
        if (plugin) {
          return plugin.provides.intent.resolver(intent, plugins);
        }

        // TODO(burdon): Why reducer?
        return filterPlugins(plugins).reduce((acc, plugin) => {
          return acc ?? plugin.provides.intent.resolver(intent, plugins);
        }, undefined);
      };

      // Sequentially dispatch array of invents.
      state.dispatch = async (...intents) => {
        let result: any = null;
        for (const intent of intents) {
          const data = intent.data ? { ...result, ...intent.data } : result;
          result = await dispatch({ ...intent, data });
        }
        return result;
      };
    },
    provides: {
      intent: state,
      context: ({ children }) => <IntentContextProvider dispatch={state.dispatch}>{children}</IntentContextProvider>,
      // TODO(burdon): Circular dependency.
      graph: {
        nodes: (node) => {
          node.actions.forEach((action) => {
            if (action.keyBinding && action.intent) {
              Mousetrap.bind(action.keyBinding, () => {
                void state.dispatch(action.intent!);
              });
            }
          });
        },
      },
    },
  };
};
