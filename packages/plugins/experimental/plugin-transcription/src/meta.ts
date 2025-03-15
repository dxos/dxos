//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const TRANSCRIPTION_PLUGIN = 'dxos.org/plugin/transcription';

export const meta = {
  id: TRANSCRIPTION_PLUGIN,
  name: 'Transcription',
  description: 'Voice transcription.',
  icon: 'ph--microphone--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-transcription',
  tags: ['experimental'],
  screenshots: [],
} satisfies PluginMeta;
