//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Meeting } from './types';

export const translations = [
  {
    'en-US': {
      [Meeting.Meeting.typename]: {
        'typename label': 'Meetings',
        'typename label_zero': 'Meetings',
        'typename label_one': 'Meeting',
        'typename label_other': 'Meetings',
        'object name placeholder': 'New meeting',
        'rename object label': 'Rename meeting',
        'delete object label': 'Delete meeting',
      },
      [meta.id]: {
        'plugin name': 'Meeting',
        'meetings label': 'All Meetings',
        'meeting label': 'Meeting',

        'start transcription label': 'Start transcription',
        'stop transcription label': 'Stop transcription',

        'meeting list label': 'Meetings',
        'create meeting label': 'Start New Meeting',
        'select meeting label': 'Set Active',

        'meeting companion label': 'Meeting Notes',
        'notes label': 'Notes',
        'summary label': 'Summary',
        'regenerate summary label': 'Regenerate Summary',
        'generate summary label': 'Generate Summary',

        'meeting thread label': 'Meeting Chat',
        'transcript companion label': 'Meeting Transcript',
      },
    },
  },
] as const satisfies Resource[];
