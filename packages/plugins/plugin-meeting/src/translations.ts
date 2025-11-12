//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Meeting } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Meeting.Meeting)]: {
        'typename label': 'Meeting',
        'typename label_zero': 'Meetings',
        'typename label_one': 'Meeting',
        'typename label_other': 'Meetings',
        'object name placeholder': 'New meeting',
        'rename object label': 'Rename meeting',
        'delete object label': 'Delete meeting',
      },
      [meta.id]: {
        'plugin name': 'Meeting',
        'settings title': 'Meeting plugin settings',
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
        'entity extraction label': 'Entity extraction',
        'entity extraction description':
          'While transcribing, use the Assistant to detect and annotate mentions of known records such as people or organizations.',
      },
    },
  },
] as const satisfies Resource[];
