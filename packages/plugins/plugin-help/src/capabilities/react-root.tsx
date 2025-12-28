//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { WelcomeTour } from '../components';
import { meta } from '../meta';
import { type Step } from '../types';

import { HelpCapabilities } from './capabilities';

export default Capability.makeModule((steps: Step[]) =>
  Capability.contributes(Capabilities.ReactRoot, {
    id: meta.id,
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
  }),
);
