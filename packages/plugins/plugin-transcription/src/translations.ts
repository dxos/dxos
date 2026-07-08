//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Transcription',
        'transcript-companion.label': 'Transcript',

        'delete.button': 'Delete',
        'bookmark.button': 'Bookmark',
        'scroll-to-end.label': 'Scroll to latest',

        'start-recording.label': 'Start recording',
        'stop-recording.label': 'Stop recording',
        'start-transcription.label': 'Start transcription',
        'stop-transcription.label': 'Stop transcription',
        'hold-to-record.label': 'Hold to record',

        'recording-options.label': 'Recording options',
        'record-mode.label': 'Record mode',
        'record-mode.toggle.label': 'Toggle',
        'record-mode.hold.label': 'Hold to record (push to talk)',
        'audio-device.label': 'Microphone',
        'audio-device.default.label': 'System default',

        'settings.entity-extraction.label': 'Entity extraction',
      },
    },
  },
] as const satisfies Resource[];
