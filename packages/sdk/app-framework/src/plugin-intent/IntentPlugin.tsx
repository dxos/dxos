//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IntentProvider } from './IntentContext';
import { INTENT_PLUGIN } from './actions';
import { dispatcherModule } from './intent-dispatcher';
import { Capabilities, Events } from '../common';
import { contributes, defineModule, definePlugin } from '../core';

export const IntentPlugin = () =>
  definePlugin({ id: INTENT_PLUGIN }, [
    dispatcherModule,
    defineModule({
      id: `${INTENT_PLUGIN}/module/react-context`,
      activatesOn: Events.Startup,
      activate: (context) => {
        const state = context.requestCapability(Capabilities.IntentDispatcher);
        return contributes(Capabilities.ReactContext, {
          id: INTENT_PLUGIN,
          context: ({ children }) => <IntentProvider value={state}>{children}</IntentProvider>,
        });
      },
    }),
  ]);
