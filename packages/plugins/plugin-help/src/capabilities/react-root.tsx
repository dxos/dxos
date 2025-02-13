//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { HelpCapabilities } from './capabilities';
import { WelcomeTour } from '../components';
import { HELP_PLUGIN } from '../meta';
import { type Step } from '../types';

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
