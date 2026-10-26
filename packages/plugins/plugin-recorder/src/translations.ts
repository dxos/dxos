//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Recording } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Recording.Recording)]: {
        'typename.label': 'Recording',
        'typename.label_zero': 'Recordings',
        'typename.label_one': 'Recording',
        'typename.label_other': 'Recordings',
        'object-name.placeholder': 'New recording',
        'rename-object.label': 'Rename recording',
        'delete-object.label': 'Delete recording',
        'object-deleted.label': 'Recording deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Recorder',
        'record.label': 'Record a voice-over (starts the presentation)',
        'record-failed.label': 'Recording could not start: {{error}}',
        'recording.label': 'REC',
        'recordings.label': 'Recordings',
        'no-recordings.message': 'No takes yet. Press Record in the presentation toolbar to record a voice-over.',
        'level-meter.label': 'Input level',
        'level.label': 'peak {{peak}} dB · level {{rms}} dB',
        'clip.label': 'CLIP',
        'no-signal.label': 'NO SIGNAL — is the mic muted?',
        'no-input.label': 'No input',
        'cover-take.label': 'Chosen',
        'slide-column.label': 'Slide',
        'recorded-column.label': 'Recorded',
        'desired-column.label': 'Desired',
        'unsaved-take.message': 'Not saved: {{error}}',
        'retry-save.label': 'Save again',
        'download-take.label': 'Save as a file',
        'discard-take.label': 'Discard',
        'settings.microphone.label': 'Microphone',
        'settings.microphone.description': 'The input a voice-over is recorded from (processing is turned off).',
        'settings.camera.label': 'Camera',
        'settings.camera.description': 'The camera a take records.',
        'settings.no-devices.placeholder': 'No devices found',
        'settings.test-microphone.label': 'Test',
        'test-microphone.label': 'Test microphone',
        'stop-test.label': 'Stop test',
      },
    },
  },
] as const satisfies Theme.Resource[];
