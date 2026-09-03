//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';

import { WelcomeTour } from '#components';
import { meta } from '#meta';
import { HelpCapabilities, Tour } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (helpSteps?: () => Promise<Tour.Step[]>) {
    // Resolved here rather than taken as a value: this module is already dynamically imported, so
    // the steps ride its chunk instead of the host's preload closure. A failed load costs the tour
    // rather than the react root, since the root mounts the whole app shell.
    const steps = helpSteps
      ? yield* Effect.tryPromise(helpSteps).pipe(
          Effect.tapError((error) => Effect.sync(() => log.warn('help steps unavailable', { error }))),
          Effect.orElseSucceed((): Tour.Step[] => []),
        )
      : [];
    return Capability.contribute(Capabilities.ReactRoot, {
      id: meta.profile.key,
      root: () => {
        const [state, updateState] = useAtomCapabilityState(HelpCapabilities.State);
        return (
          <WelcomeTour
            steps={steps}
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
