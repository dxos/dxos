//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { MEETING_PLUGIN } from './meta';
import { MeetingType } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(MeetingType)]: {
        'typename label': 'Meetings',
        'typename label_zero': 'Meetings',
        'typename label_one': 'Meeting',
        'typename label_other': 'Meetings',
        'object name placeholder': 'New meeting',
      },
      [MEETING_PLUGIN]: {
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

export default translations;
