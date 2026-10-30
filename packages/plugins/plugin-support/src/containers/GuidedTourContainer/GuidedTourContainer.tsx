//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';

import { GuidedTour } from '#components';
import { useTourSteps } from '#hooks';
import { HelpCapabilities } from '#types';

/** Runs whichever tour the help state names, and forgets it once the reader closes it or leaves its subject. */
export const GuidedTourContainer = () => {
  const [state, updateState] = Hooks.useAtomCapabilityState(HelpCapabilities.State);
  const steps = useTourSteps(state.tourId, state.subjectId);
  const layout = ToolkitHooks.useLayout();
  const subjectOpen = !state.subjectId || layout.active.includes(state.subjectId);

  return (
    <GuidedTour
      steps={steps}
      running={state.running && subjectOpen && steps.length > 0}
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
