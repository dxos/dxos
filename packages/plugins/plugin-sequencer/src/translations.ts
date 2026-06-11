//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Score } from '#types';

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
      },
      [meta.id]: {
        'plugin.name': 'Sequencer',
        'add-track.label': 'Add track',
        'remove-track.label': 'Remove track',
        'play.label': 'Play',
        'stop.label': 'Stop',
        'tempo.label': 'Tempo (BPM)',
      },
    },
  },
] as const satisfies Resource[];
