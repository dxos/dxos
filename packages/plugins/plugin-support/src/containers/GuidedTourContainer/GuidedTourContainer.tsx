//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';

import { GuidedTour } from '#components';
import { useTourSteps } from '#hooks';
import { HelpCapabilities } from '#types';

const stopped = (state: HelpCapabilities.State): HelpCapabilities.State => ({
  ...state,
  running: false,
  tourId: undefined,
  subjectId: undefined,
  showHints: false,
});

/** Runs whichever tour the help state names, and forgets it once the reader closes it or leaves its subject. */
export const GuidedTourContainer = () => {
  const [state, updateState] = Hooks.useAtomCapabilityState(HelpCapabilities.State);
  const steps = useTourSteps(state.tourId, state.subjectId);
  const layout = ToolkitHooks.useLayout();
  const subjectClosed = state.subjectId !== undefined && !layout.active.includes(state.subjectId);

  // The card may already be closed (a boot onto another item, a paused tour), so nothing else reports the stop.
  useEffect(() => {
    if (state.running && subjectClosed) {
      updateState((current) => (current.subjectId === state.subjectId ? stopped(current) : current));
    }
  }, [state.running, state.subjectId, subjectClosed]);

  return (
    <GuidedTour
      steps={steps}
      running={state.running && steps.length > 0}
      onRunningChanged={(running) =>
        updateState((current) => (running ? { ...current, running: true } : stopped(current)))
      }
    />
  );
};

GuidedTourContainer.displayName = 'GuidedTourContainer';
