//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { log } from '@dxos/log';

import { type IntentContext, IntentProvider } from './IntentContext';
import type { Intent, IntentResolver, IntentResult } from './intent';
import IntentMeta from './meta';
import { type IntentPluginProvides, type IntentResolverProvides, parseIntentResolverPlugin } from './provides';
import type { PluginDefinition } from '../PluginHost';
import { filterPlugins, findPlugin } from '../helpers';

const EXECUTION_LIMIT = 1000;

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 * Inspired by https://developer.android.com/reference/android/content/Intent.
 */
const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = deepSignal<IntentContext>({ dispatch: async () => ({}), registerResolver: () => () => {} });

  const dynamicResolvers = new Set<{ plugin: string; resolver: IntentResolver }>();

  return {
    meta: IntentMeta,
    ready: async (plugins) => {
      // Dispatch intent to associated plugin.
      const dispatch = async (intent: Intent) => {
        if (intent.plugin) {
          for (const entry of dynamicResolvers) {
            if (entry.plugin === intent.plugin) {
              const result = await entry.resolver(intent, plugins);
              if (result) {
                return result;
              }
            }
          }

          const plugin = findPlugin<IntentResolverProvides>(plugins, intent.plugin);
          const result = plugin?.provides.intent.resolver(intent, plugins);
          return result;
        }

        for (const entry of dynamicResolvers) {
          const result = await entry.resolver(intent, plugins);
          if (result) {
            return result;
          }
        }

        // Return resolved value from first plugin that handles the intent.
        for (const plugin of filterPlugins(plugins, parseIntentResolverPlugin)) {
          const result = await plugin.provides.intent.resolver(intent, plugins);
          if (result) {
            return result;
          }
        }

        log.warn('No plugin found to handle intent', intent);
      };

      // Sequentially dispatch array of invents.
      const dispatchChain = async (intentOrArray: Intent | Intent[], depth = 0) => {
        if (depth > EXECUTION_LIMIT) {
          return {
            error: new Error(
              `Intent execution limit exceeded (${EXECUTION_LIMIT} iterations). This is likely due to an infinite loop within intent resolvers.`,
            ),
          };
        }

        let result: IntentResult | undefined;
        for (const intent of Array.isArray(intentOrArray) ? intentOrArray : [intentOrArray]) {
          const data = intent.data ? { result: result?.data, ...intent.data } : result?.data;
          result = (await dispatch({ ...intent, data })) ?? undefined;

          if (result?.error) {
            break;
          }

          result?.intents?.forEach((intents) => {
            void dispatchChain(intents, depth + 1);
          });
        }

        return result;
      };

      state.dispatch = dispatchChain;
      state.registerResolver = (plugin, resolver) => {
        const entry = { plugin, resolver };
        dynamicResolvers.add(entry);
        return () => dynamicResolvers.delete(entry);
      };
    },
    provides: {
      intent: state,
      context: ({ children }) => <IntentProvider value={state}>{children}</IntentProvider>,
    },
  };
};

export default IntentPlugin;
