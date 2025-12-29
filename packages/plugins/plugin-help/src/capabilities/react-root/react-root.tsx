//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { WelcomeTour } from '../../components';
import { meta } from '../../meta';
import { HelpCapabilities, type Step } from '../../types';

export default Capability.makeModule((steps: Step[]) =>
  Capability.contributes(Common.Capability.ReactRoot, {
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
