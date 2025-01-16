//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { HelpCapabilities } from './capabilities';
import { HelpContextProvider } from '../components';
import { HELP_PLUGIN } from '../meta';
import { type Step } from '../types';

export default (steps: Step[]) =>
  contributes(Capabilities.ReactContext, {
    id: HELP_PLUGIN,
    context: ({ children }) => {
      const state = useCapability(HelpCapabilities.MutableState);
      return (
        <HelpContextProvider
          steps={steps}
          running={state.running}
          onRunningChanged={(newState) => {
            state.running = newState;
            if (!newState) {
              state.showHints = false;
            }
          }}
        >
          {children}
        </HelpContextProvider>
      );
    },
  });
