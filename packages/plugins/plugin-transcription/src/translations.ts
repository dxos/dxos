//
// Copyright 2023 DXOS.org
//

import { translations as transcriptionTranslations } from '@dxos/react-ui-transcription/translations';
import type * as Theme from '@dxos/react-ui/Theme';

import { TranscriptionNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [TranscriptionNamespace.key]: {
        'plugin.name': 'Transcription',
        'transcript-companion.label': 'Transcript',

        'delete.button': 'Delete',
        'bookmark.button': 'Bookmark',
        'scroll-to-end.label': 'Scroll to latest',

        'start-recording.label': 'Start recording',
        'microphone-denied.label': 'Microphone access denied',
        'stop-recording.label': 'Stop recording',
        'hold-to-record.label': 'Hold to record',
      },
    },
  },
  // The mic's option labels belong to the component that renders them; re-exported here so a host
  // loading this plugin still gets them, the way plugin-tasks re-exports react-ui-task's.
  ...transcriptionTranslations,
] as const satisfies Theme.Resource[];
