//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Instrument, Score } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Score.Score)]: {
        'typename.label': 'Score',
        'typename.label_zero': 'Scores',
        'typename.label_one': 'Score',
        'typename.label_other': 'Scores',
        'object-name.placeholder': 'New score',
        'add-object.label': 'Add score',
        'rename-object.label': 'Rename score',
        'delete-object.label': 'Delete score',
        'object-deleted.label': 'Score deleted',
      },
      [Type.getTypename(Instrument.Instrument)]: {
        'typename.label': 'Instrument',
        'typename.label_zero': 'Instruments',
        'typename.label_one': 'Instrument',
        'typename.label_other': 'Instruments',
        'object-name.placeholder': 'New instrument',
        'add-object.label': 'Add instrument',
        'rename-object.label': 'Rename instrument',
        'delete-object.label': 'Delete instrument',
        'object-deleted.label': 'Instrument deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Sequencer',
        'add-track.label': 'Add track',
        'remove-track.label': 'Remove track',
        'play.label': 'Play',
        'stop.label': 'Stop',
        'tempo.label': 'Tempo (BPM)',
      },
    },
  },
] as const satisfies Theme.Resource[];
