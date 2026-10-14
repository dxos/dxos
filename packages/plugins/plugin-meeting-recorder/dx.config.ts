//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.meetingRecorder',
    name: 'Meeting Recorder',
    author: 'DXOS',
    description: trim`
      Meeting notes for calls held in other apps, in the style of Granola.
      On Composer Desktop the recorder notices when Zoom, Google Meet, Microsoft Teams, FaceTime, Slack or any other app starts using the microphone and offers to take notes; one click (or none, with auto-start) creates a Meeting object and begins transcribing.

      Your microphone is transcribed as you and the system audio as the other participants, so the transcript reads as a conversation without anyone joining a bot to the call.
      When the other app releases the microphone the recording stops on its own and the Meeting plugin writes an AI summary of the transcript and your notes.

      In a browser, where other apps cannot be observed, recording still works from the microphone and is started by hand from the status bar or the command palette.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting-recorder',
    icon: { key: 'ph--record--regular', hue: 'red' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
