//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React from 'react';

import { create } from '@dxos/live-object';

import { IntentProvider } from './IntentContext';
import { INTENT_PLUGIN } from './actions';
import { type AnyIntentResolver, createDispatcher, type IntentContext } from './intent-dispatcher';
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
        });

        // TODO(wittjosiah): Make getResolver callback async and allow resolvers to be requested on demand.
        const { dispatch, dispatchPromise, undo, undoPromise } = createDispatcher((module) =>
          context
            .requestCapabilities(Capabilities.IntentResolver, (c, moduleId): c is AnyIntentResolver => {
              return module ? moduleId === module : true;
            })
            .flat(),
        );

        state.dispatch = dispatch;
        state.dispatchPromise = dispatchPromise;
        state.undo = undo;
        state.undoPromise = undoPromise;

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
