//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React from 'react';

import { create } from '@dxos/live-object';

import { Capabilities, Events } from './common';
import { eventKey } from './manager';
import { contributes, defineModule, definePlugin } from './plugin';
import { createDispatcher, type IntentContext, IntentProvider } from '../plugin-intent';
import IntentMeta from '../plugin-intent/meta';

const defaultEffect = () => Effect.fail(new Error('Intent runtime not ready'));
const defaultPromise = () => Effect.runPromise(defaultEffect());

export const IntentPlugin = definePlugin(IntentMeta, [
  defineModule({
    id: `${IntentMeta.id}/module/dispatcher`,
    // TODO(wittjosiah): This will mean that startup needs to be reset when intents are added or removed.
    //   This is fine for now because it's how it worked prior to capabilities api anyways.
    //   In the future, the intent dispatcher should be able to be reset without resetting the entire app.
    activationEvents: [eventKey(Events.Startup)],
    dependentEvents: [eventKey(Events.SetupIntents)],
    triggeredEvents: [eventKey(Events.DispatcherReady)],
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
          id: IntentMeta.id,
          context: ({ children }) => <IntentProvider value={state}>{children}</IntentProvider>,
        }),
      ];
    },
  }),
]);
