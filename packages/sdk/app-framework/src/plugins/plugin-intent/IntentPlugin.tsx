//
// Copyright 2023 DXOS.org
//

import { Effect } from 'effect';
import React from 'react';

import { create } from '@dxos/live-object';

import { IntentProvider } from './IntentContext';
import { createDispatcher, type AnyIntentResolver, type IntentContext } from './intent-dispatcher';
import IntentMeta from './meta';
import { type IntentPluginProvides, type ResolverDefinitions, parseIntentResolverPlugin } from './provides';
import { filterPlugins } from '../helpers';
import { type PluginDefinition } from '../plugin-host';

const defaultEffect = () => Effect.fail(new Error('Intent runtime not ready'));
const defaultPromise = () => Effect.runPromise(defaultEffect());

/**
 * Allows plugins to register intent handlers and routes sent intents to the appropriate plugin.
 * Inspired by https://developer.android.com/reference/android/content/Intent.
 */
export const IntentPlugin = (): PluginDefinition<IntentPluginProvides> => {
  const state = create<IntentContext>({
    dispatch: defaultEffect,
    dispatchPromise: defaultPromise,
    undo: defaultEffect,
    undoPromise: defaultPromise,
  });

  return {
    meta: IntentMeta,
    ready: async ({ plugins }) => {
      const resolvers = Object.fromEntries(
        filterPlugins(plugins, parseIntentResolverPlugin).map((plugin): [string, AnyIntentResolver[]] => {
          const resolvers = reduceResolvers(
            plugin.provides.intent.resolvers({ plugins, dispatch: (intent) => state.dispatch(intent) }),
          );
          return [plugin.meta.id, resolvers];
        }),
      );
      const { dispatch, dispatchPromise, undo, undoPromise } = createDispatcher(resolvers);

      state.dispatch = dispatch;
      state.dispatchPromise = dispatchPromise;
      state.undo = undo;
      state.undoPromise = undoPromise;
    },
    provides: {
      intent: state,
      context: ({ children }) => <IntentProvider value={state}>{children}</IntentProvider>,
    },
  };
};

const reduceResolvers = (
  definitions: ResolverDefinitions,
  resolvers: AnyIntentResolver[] = [],
): AnyIntentResolver[] => {
  if (Array.isArray(definitions)) {
    return definitions.reduce((acc: AnyIntentResolver[], definition) => reduceResolvers(definition, acc), resolvers);
  }

  return [...resolvers, definitions];
};
