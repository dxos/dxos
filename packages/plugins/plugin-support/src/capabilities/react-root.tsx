//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { useAtomCapabilityState } from '@dxos/app-framework/ui';

import { TourAutoStart, WelcomeTour } from '#components';
import { useTourSteps } from '#hooks';
import { meta } from '#meta';
import { HelpCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactRoot, {
      id: meta.profile.key,
      root: () => {
        const [state, updateState] = useAtomCapabilityState(HelpCapabilities.State);
        const steps = useTourSteps(state.tourId);
        return (
          <>
            <TourAutoStart />
            <WelcomeTour
              steps={steps}
              running={state.running && steps.length > 0}
              onRunningChanged={(newState) => {
                updateState((s) => ({ ...s, running: newState }));
                if (!newState) {
                  updateState((s) => ({ ...s, showHints: false }));
                }
              }}
            />
          </>
        );
      },
    }),
  ),
);
