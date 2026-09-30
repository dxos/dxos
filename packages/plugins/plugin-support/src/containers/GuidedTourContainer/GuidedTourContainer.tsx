//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';

import { GuidedTour } from '#components';
import { useTourSteps } from '#hooks';
import { HelpCapabilities } from '#types';

/** Runs whichever tour the help state names, and forgets it once the reader closes it. */
export const GuidedTourContainer = () => {
  const [state, updateState] = useAtomCapabilityState(HelpCapabilities.State);
  const steps = useTourSteps(state.tourId, state.subjectId);

  return (
    <GuidedTour
      steps={steps}
      running={state.running && steps.length > 0}
      onRunningChanged={(running) =>
        updateState((current) =>
          running
            ? { ...current, running: true }
            : { ...current, running: false, tourId: undefined, subjectId: undefined, showHints: false },
        )
      }
    />
  );
};

GuidedTourContainer.displayName = 'GuidedTourContainer';
