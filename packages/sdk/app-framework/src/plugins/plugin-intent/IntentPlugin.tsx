//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/live-object';
import { log } from '@dxos/log';

import { type IntentContext, type IntentExecution, IntentProvider } from './IntentContext';
import { isUndoable } from './helpers';
import type { Intent, IntentResolver } from './intent';
import IntentMeta from './meta';
import {
  IntentAction,
  type IntentPluginProvides,
  type IntentResolverProvides,
  parseIntentResolverPlugin,
} from './provides';
import { filterPlugins, findPlugin } from '../helpers';
import { type PluginDefinition } from '../plugin-host';

const EXECUTION_LIMIT = 1000;
const HISTORY_LIMIT = 100;

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 * Inspired by https://developer.android.com/reference/android/content/Intent.
 */
export const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = create<IntentContext>({
    dispatch: async () => ({}),
    undo: async () => ({}),
    history: [],
    registerResolver: () => () => {},
  });

  const dynamicResolvers = new Set<{ plugin: string; resolver: IntentResolver }>();

  return {
    meta: IntentMeta,
    ready: async (plugins) => {
      // Dispatch intent to associated plugin.
      const dispatch = async (intent: Intent) => {
        log('dispatch', { action: intent.action, intent });
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
          return plugin?.provides.intent.resolver(intent, plugins);
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

        // https://vitejs.dev/guide/env-and-mode#env-variables
        // TODO(wittjosiah): How to handle this more generically?
        if (import.meta?.env?.DEV) {
          log.warn('No plugin found to handle intent', intent);
        }
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

        const executionResults: IntentExecution[] = [];
        const chain = Array.isArray(intentOrArray) ? intentOrArray : [intentOrArray];
        for (const intent of chain) {
          const { result: prevResult } = executionResults.at(-1) ?? {};
          const data = intent.data ? { result: prevResult?.data, ...intent.data } : prevResult?.data;
          const result = await dispatch({ ...intent, data });

          if (!result || result?.error) {
            break;
          }

          executionResults.push({ intent, result });

          // TODO(wittjosiah): How does undo work with returned intents?
          result?.intents?.forEach((intents) => {
            void dispatchChain(intents, depth + 1);
          });
        }

        state.history.push(executionResults);
        if (state.history.length > HISTORY_LIMIT) {
          state.history.splice(0, state.history.length - HISTORY_LIMIT);
        }

        if (isUndoable(executionResults)) {
          void dispatch({ action: IntentAction.SHOW_UNDO, data: { results: executionResults } });
        }

        return executionResults.at(-1)?.result;
      };

      const undo = async () => {
        const last = state.history.findLastIndex(isUndoable);
        const chain =
          last !== -1 &&
          state.history[last]?.map(({ intent, result }): Intent => {
            const data = result.undoable?.data ? { ...intent.data, ...result.undoable.data } : intent.data;
            return { ...intent, data, undo: true };
          });
        if (chain) {
          const result = await dispatchChain(chain);
          state.history = state.history.filter((_, index) => index !== last);
          return result;
        }
      };

      state.dispatch = dispatchChain;
      state.undo = undo;
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
