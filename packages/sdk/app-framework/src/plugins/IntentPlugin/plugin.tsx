//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { type IntentContext, IntentProvider } from './IntentContext';
import type { Intent } from './intent';
import IntentMeta from './meta';
import { type IntentPluginProvides, type IntentResolverProvides, parseIntentResolverPlugin } from './provides';
import type { PluginDefinition } from '../PluginHost';
import { filterPlugins, findPlugin } from '../helpers';

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 * Inspired by https://developer.android.com/reference/android/content/Intent.
 */
const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = deepSignal<IntentContext>({ dispatch: async () => {} });

  return {
    meta: IntentMeta,
    ready: async (plugins) => {
      // Dispatch intent to associated plugin.
      const dispatch = async (intent: Intent) => {
        if (intent.plugin) {
          const plugin = findPlugin<IntentResolverProvides>(plugins, intent.plugin);
          return plugin?.provides.intent.resolver(intent, plugins);
        }

        // Return resolved value from first plugin that handles the intent.
        for (const plugin of filterPlugins(plugins, parseIntentResolverPlugin)) {
          const result = await plugin.provides.intent.resolver(intent, plugins);
          if (result) {
            return result;
          }
        }
      };

      // Sequentially dispatch array of invents.
      state.dispatch = async (intentOrArray) => {
        let result: any = null;
        for (const intent of Array.isArray(intentOrArray) ? intentOrArray : [intentOrArray]) {
          const data = intent.data ? { ...result, ...intent.data } : result;
          result = await dispatch({ ...intent, data });
        }
        return result;
      };
    },
    provides: {
      intent: state,
      context: ({ children }) => <IntentProvider value={state}>{children}</IntentProvider>,
    },
  };
};

export default IntentPlugin;
