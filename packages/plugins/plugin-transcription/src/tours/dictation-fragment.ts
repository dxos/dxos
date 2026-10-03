//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/app-toolkit/Tour';

export const steps: Tour.Step[] = [
  {
    target: '[data-testid="transcription.record"]',
    title: 'Dictate',
    description: 'Hold to speak and the transcript is written in at the cursor.',
    placement: 'bottom',
  },
];

export default steps;
