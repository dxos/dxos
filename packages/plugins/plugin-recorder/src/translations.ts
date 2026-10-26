//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Recorder',
        'record.label': 'Record the voice-over of every slide (starts the presentation)',
        'record-slide.label': 'Record a new take of this slide',
        'play-voice-over.label': 'Play the voice-over (the main take of each slide)',
        'stop-voice-over.label': 'Stop',
        'download-voice-over.label': 'Download the voice-over (the main take of each slide, as one file)',
        'select-take.label': 'Make this the main take',
        'main-take.label': 'Main',
        'take-deleted.label': 'Take deleted',
        'no-takes.message': 'No takes yet. Press Record to read this slide.',
        'no-current-take.label': 'Select a take to play it',
        'slide-takes.label': 'Takes',
        'voice-over.label': 'Voice-over',
        'play-slide.label': 'Play the main take of the current slide',
        'open-slide.label': 'Open the current slide',
        'take-count.label_one': '1 take',
        'take-count.label_other': '{{count}} takes',
        'record-failed.label': 'Recording could not start: {{error}}',
        'recording.label': 'REC',
        'slide-remaining.label': '{{time}} left on slide',
        'slide-over.label': '{{time}} over',
        'recordings.label': 'Recordings',
        'level-meter.label': 'Input level',
        'level.label': 'peak {{peak}} dB · level {{rms}} dB',
        'clip.label': 'CLIP',
        'no-signal.label': 'NO SIGNAL — is the mic muted?',
        'no-input.label': 'No input',
        'unsaved-take.message': 'Not saved: {{error}}',
        'retry-save.label': 'Save again',
        'download-take.label': 'Download',
        'play-take.label': 'Play',
        'stop-take.label': 'Stop',
        'delete-take.label': 'Delete take',
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
