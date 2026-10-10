//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Handpan',
        'scale.label': 'Scale',
        'mode-calibrate.label': 'Calibrate',
        'mode-live.label': 'Live',
        'start.label': 'Start listening',
        'stop.label': 'Stop listening',
        'reset-calibration.label': 'Reset calibration',
        'calibrate-prompt.message': 'Play note {{note}}',
        'calibrate-complete.message': 'Calibration complete',
        'listening.message': 'Listening…',
        'idle.message': 'Press start and play a note',
        'percussive.label': 'Tak',
        'clarity.label': 'Clarity',
        'cents.label': 'Cents',
        'strike-percussive.message': 'no pitch heard, strike again',
        'strike-out-of-tune.message': 'that was a different note',
        'strike-complete.message': 'all notes calibrated',
      },
    },
  },
] as const satisfies Theme.Resource[];
