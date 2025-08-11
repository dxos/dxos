//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { WelcomeTour } from '../components';
import { HELP_PLUGIN } from '../meta';
import { type Step } from '../types';

import { HelpCapabilities } from './capabilities';

export default (steps: Step[]) =>
  contributes(Capabilities.ReactRoot, {
    id: HELP_PLUGIN,
    root: () => {
      const state = useCapability(HelpCapabilities.MutableState);
      return (
        <WelcomeTour
          steps={steps}
          running={state.running}
          onRunningChanged={(newState) => {
            state.running = newState;
            if (!newState) {
              state.showHints = false;
            }
          }}
        />
      );
    },
  });
