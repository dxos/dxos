//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Song } from '#types';

export const translations = [
  {
    'en-US': {
      [Song.Song.typename]: {
        'typename.label': 'Song',
        'typename.label_zero': 'Songs',
        'typename.label_one': 'Song',
        'typename.label_other': 'Songs',
      },
      [meta.id]: {
        'plugin.name': 'Sequence',
        'add-track.label': 'Add track',
        'remove-track.label': 'Remove track',
        'play.label': 'Play',
        'stop.label': 'Stop',
        'tempo.label': 'Tempo (BPM)',
      },
    },
  },
] as const satisfies Resource[];
