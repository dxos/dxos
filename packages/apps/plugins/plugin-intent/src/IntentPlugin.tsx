//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { createContext, useContext } from 'react';

import { Plugin, PluginDefinition, findPlugin } from '@dxos/react-surface';

// Intents inspired by https://developer.android.com/reference/android/content/Intent.

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 */
export const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = deepSignal<{ sendIntent: SendIntent }>({ sendIntent: async () => {} });

  return {
    meta: {
      id: 'dxos.org/plugin/intent',
    },
    ready: async (plugins) => {
      const sendIntent = (intent: Intent) => {
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

      state.sendIntent = async (...intents) => {
        let result: any = null;
        for (const intent of intents) {
          const data = intent.data ? { ...result, ...intent.data } : result;
          result = await sendIntent({ ...intent, data });
        }
        return result;
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
    /**
     * Trigger one or more intents to be sent.
     * If multiple intents are specified, the result of each will be merged with the data to the next.
     *
     * @returns The result of the last intent.
     */
    sendIntent: SendIntent;
  };
};

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent = {
  /**
   * Plugin ID.
   * If specified, the intent will be sent explicitly to the plugin.
   * Otherwise, the intent will be sent to all plugins, in order and the first to resolve a non-null value will be used.
   */
  plugin?: string;

  /**
   * The action to perform.
   */
  action: string;

  /**
   * Any data needed to perform the desired action.
   */
  data?: any;
};

export type SendIntent = (...intents: Intent[]) => Promise<any>;

export type IntentContextValue = {
  sendIntent: SendIntent;
};

const IntentContext = createContext<IntentContextValue>({ sendIntent: async () => {} });

export const useIntent = () => useContext(IntentContext);

export type IntentProvides = {
  intent: {
    resolver: (intent: Intent, plugins: Plugin[]) => any;
  };
};

type IntentPlugin = Plugin<IntentProvides>;
const intentPlugins = (plugins: Plugin[]): IntentPlugin[] =>
  (plugins as IntentPlugin[]).filter((p) => typeof p.provides?.intent?.resolver === 'function');
