//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Meeting } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Meeting.Meeting)]: {
        'typename.label': 'Meeting',
        'typename.label_zero': 'Meetings',
        'typename.label_one': 'Meeting',
        'typename.label_other': 'Meetings',
        'object-name.placeholder': 'New meeting',
        'add-object.label': 'Add meeting',
        'rename-object.label': 'Rename meeting',
        'delete-object.label': 'Delete meeting',
        'object-deleted.label': 'Meeting deleted',
      },
      [meta.id]: {
        'plugin.name': 'Meeting',
        'meetings.label': 'All Meetings',
        'meeting.label': 'Meeting',

        'start-call.label': 'Start call',
        'start-transcription.label': 'Start transcription',
        'stop-transcription.label': 'Stop transcription',

        'meeting-list.label': 'Meetings',
        'create-meeting.label': 'Start New Meeting',
        'create-meeting-for-event.label': 'Create meeting',
        'select-meeting.label': 'Set Active',
        'share-call-link.label': 'Share call link',

        'meeting-toolbar.menu': 'Meeting',
        'meeting-tabs.menu': 'View',
        'meeting-companion.label': 'Meeting Notes',
        'notes.label': 'Notes',
        'transcript.label': 'Transcript',
        'stats.label': 'Stats',
        'summary.label': 'Summary',
        'regenerate-summary.label': 'Regenerate Summary',
        'generate-summary.label': 'Generate Summary',

        'transcript-companion.label': 'Meeting Transcript',
      },
    },
  },
] as const satisfies Resource[];
