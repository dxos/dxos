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
        'start.label': 'Start',
        'stop.label': 'Stop',
        'reset-calibration.label': 'Reset calibration',
        'calibrate-prompt.message': 'Play note {{note}}',
        'calibrate-complete.message': 'Calibration complete',
        'listening.message': 'Listening…',
        'idle.message': 'Press start and play a note',
        'percussive.label': 'Tak',
        'clarity.label': 'Clarity',
        'history.label': 'Recent strikes, oldest first (D = ding, 1–n = tone fields, T = tak)',
        'cents.label': 'Cents',
        'strike-percussive.message': 'no pitch heard, strike again',
        'strike-imprecise.message': 'let the note ring a little longer',
        'strike-out-of-tune.message': 'that was a different note',
        'strike-complete.message': 'all notes calibrated',
      },
    },
  },
] as const satisfies Theme.Resource[];
