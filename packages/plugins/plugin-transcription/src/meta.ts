//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/transcription',
  name: 'Transcription',
  description: trim`
    Real-time voice-to-text transcription service for capturing spoken content.
    Convert audio input into searchable text that integrates seamlessly with notes and documents.
  `,
  icon: 'ph--microphone--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transcription',
  tags: ['labs'],
  screenshots: [],
};
