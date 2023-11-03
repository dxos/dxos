//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { type IntentContext, IntentProvider } from './IntentContext';
import { type Intent } from './intent';
import { type PluginDefinition, type Plugin } from '../PluginHost';
import { filterPlugins, findPlugin } from '../helpers';

export type IntentResolverProvides = {
  intent: {
    resolver: (intent: Intent, plugins: Plugin[]) => any;
  };
};

export type IntentPluginProvides = {
  intent: IntentContext;
};

export const parseIntentPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.dispatch ? (plugin as Plugin<IntentPluginProvides>) : undefined;

export const parseIntentResolverPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.resolver ? (plugin as Plugin<IntentResolverProvides>) : undefined;

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 * Inspired by https://developer.android.com/reference/android/content/Intent.
 */
export const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = deepSignal<IntentContext>({ dispatch: async () => {} });

  return {
    meta: {
      id: 'dxos.org/plugin/intent',
    },
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
