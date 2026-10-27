//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { MeetingRecorderNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [MeetingRecorderNamespace.key]: {
        'plugin.name': 'Meeting Recorder',

        'record-meeting.label': 'Record a meeting',
        'take-notes-for.label': 'Take notes · {{app}}',
        'dismiss.label': 'Dismiss',
        'starting.label': 'Starting…',
        'stopping.label': 'Saving…',
        'recording.label': 'Recording {{elapsed}} · {{source}}',
        'microphone.label': 'Microphone',

        'meeting-detected.title': 'Meeting detected — take notes?',
        'take-notes.label': 'Take notes',
        'take-notes.alt': 'Record and transcribe this meeting',

        'recording-started.title': 'Recording meeting',
        'recording-started.description': 'Transcribing you and the other participants.',
        'recording-started-mic-only.description': 'Transcribing your microphone.',
        'recording-stopped.title': 'Meeting saved',
        'recording-stopped.description': 'The transcript is in the meeting.',
        'recording-stopped-summarizing.description': 'Writing a summary of the meeting…',
      },
    },
  },
] as const satisfies Theme.Resource[];
