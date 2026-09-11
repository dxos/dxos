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
        // Only while running: `tourId` is persisted and outlives a run, so asking for steps by id alone
        // composes at boot, against nothing attended, and the machine opens on that stale composition.
        const steps = useTourSteps(state.running ? state.tourId : undefined);
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
