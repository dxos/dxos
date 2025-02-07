//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IntentProvider } from './IntentContext';
import { INTENT_PLUGIN } from './actions';
import { dispatcherModule } from './intent-dispatcher';
import { Capabilities, Events } from '../common';
import { contributes, defineModule, definePlugin } from '../core';
import { useCapability } from '../react';

export const IntentPlugin = () =>
  definePlugin({ id: INTENT_PLUGIN }, [
    dispatcherModule,
    defineModule({
      id: `${INTENT_PLUGIN}/module/react-context`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(Capabilities.ReactContext, {
          id: INTENT_PLUGIN,
          context: ({ children }) => {
            const value = useCapability(Capabilities.IntentDispatcher);
            return <IntentProvider value={value}>{children}</IntentProvider>;
          },
        }),
    }),
  ]);
