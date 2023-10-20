//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { type IntentContext, IntentProvider } from './IntentContext';
import { type Intent } from './intent';
import { type PluginDefinition, type Plugin } from '../PluginHost';
import { filterPlugins, findPlugin } from '../helpers';

export type IntentProvides = {
  intent: {
    resolver: (intent: Intent, plugins: Plugin[]) => any;
  };
};

export type IntentPluginProvides = {
  intent: IntentContext;
};

export const isIntentPlugin = (plugin: Plugin): plugin is Plugin<IntentPluginProvides> =>
  Boolean((plugin.provides as IntentPluginProvides).intent);

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
      const dispatch = (intent: Intent) => {
        const plugin = intent.plugin && findPlugin<IntentProvides>(plugins, intent.plugin);
        if (plugin) {
          return plugin.provides.intent.resolver(intent, plugins);
        }

        // Return resolved value from first plugin that handles the intent.
        return filterPlugins<IntentProvides>(
          plugins,
          (plugin) => typeof plugin.provides.intent?.resolver === 'function',
        ).reduce((acc, plugin) => {
          return acc ?? plugin.provides.intent.resolver(intent, plugins);
        }, undefined);
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
