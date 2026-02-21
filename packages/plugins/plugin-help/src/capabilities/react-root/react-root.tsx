//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useAtomCapabilityState } from '@dxos/app-framework/ui';

import { WelcomeTour } from '../../components';
import { meta } from '../../meta';
import { HelpCapabilities, type Step } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (steps?: Step[]) {
    return Capability.contributes(Capabilities.ReactRoot, {
      id: meta.id,
      root: () => {
        const [state, updateState] = useAtomCapabilityState(HelpCapabilities.State);
        return (
          <WelcomeTour
            steps={steps ?? []}
            running={state.running}
            onRunningChanged={(newState) => {
              updateState((s) => ({ ...s, running: newState }));
              if (!newState) {
                updateState((s) => ({ ...s, showHints: false }));
              }
            }}
          />
        );
      },
    });
  }),
);
