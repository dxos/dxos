//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React from 'react';

import { create } from '@dxos/live-object';

import { IntentProvider } from './IntentContext';
import { INTENT_PLUGIN } from './actions';
import { createDispatcher, type IntentContext } from './intent-dispatcher';
import { Capabilities, Events } from '../common';
import { contributes, defineModule, definePlugin } from '../core';

const defaultEffect = () => Effect.fail(new Error('Intent runtime not ready'));
const defaultPromise = () => Effect.runPromise(defaultEffect());

export const IntentPlugin = () =>
  definePlugin({ id: INTENT_PLUGIN }, [
    defineModule({
      id: `${INTENT_PLUGIN}/module/dispatcher`,
      // TODO(wittjosiah): This will mean that startup needs to be reset when intents are added or removed.
      //   This is fine for now because it's how it worked prior to capabilities api anyways.
      //   In the future, the intent dispatcher should be able to be reset without resetting the entire app.
      activatesOn: Events.Startup,
      dependsOn: [Events.SetupIntents],
      triggers: [Events.DispatcherReady],
      activate: (context) => {
        const state = create<IntentContext>({
          dispatch: defaultEffect,
          dispatchPromise: defaultPromise,
          undo: defaultEffect,
          undoPromise: defaultPromise,
          registerResolver: () => () => {},
        });

        const resolvers = context.requestCapabilities(Capabilities.IntentResolver).flat();
        // TODO(wittjosiah): Dispatcher will lose its ability to filter by plugin id.
        const { dispatch, dispatchPromise, undo, undoPromise, registerResolver } = createDispatcher({ '': resolvers });

        state.dispatch = dispatch;
        state.dispatchPromise = dispatchPromise;
        state.undo = undo;
        state.undoPromise = undoPromise;
        state.registerResolver = registerResolver;

        return [
          contributes(Capabilities.IntentDispatcher, state),
          contributes(Capabilities.ReactContext, {
            id: INTENT_PLUGIN,
            context: ({ children }) => <IntentProvider value={state}>{children}</IntentProvider>,
          }),
        ];
      },
    }),
  ]);
