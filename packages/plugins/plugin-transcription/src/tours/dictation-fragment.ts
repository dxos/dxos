//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/plugin-support/Tour';

/**
 * Contributed into whatever tour is running where dictation is offered.
 *
 * Targets the control's own testid. The graph action behind it is a `custom` variant that renders
 * its own element, so a `testId` on the action's properties is never applied.
 */
export const steps: Tour.Step[] = [
  {
    target: '[data-testid="transcription.record"]',
    title: 'Dictate',
    description: 'Hold to speak and the transcript is written in at the cursor.',
    placement: 'bottom',
  },
];

export default steps;
