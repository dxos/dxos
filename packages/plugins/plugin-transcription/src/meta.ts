//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const TRANSCRIPTION_PLUGIN = 'dxos.org/plugin/transcription';

export const meta: PluginMeta = {
  id: TRANSCRIPTION_PLUGIN,
  name: 'Transcription',
  description: 'Voice transcription.',
  icon: 'ph--microphone--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transcription',
  tags: ['labs'],
  screenshots: [],
};
