//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { TransformerNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TransformerNamespace.key,
    name: 'Transformer',
    author: 'DXOS',
    description: trim`
      Browser-based machine learning plugin that runs Hugging Face Transformers.js models
      entirely in-browser via WebAssembly and WebGPU — no server-side inference required.

      Provides automatic speech recognition through a Whisper pipeline hook (usePipeline)
      and a microphone capture hook (useAudioStream) that buffers 16 kHz mono audio into
      2-second chunks before forwarding them to the model.

      Exposes a Voice component that wires the two hooks together to deliver live
      transcription, accumulating the running transcript in local state and rendering
      a debug panel with model status, GPU info, and audio level visualisation.

      Includes a RAG embedding pipeline base class for retrieval-augmented generation
      experiments, with cosine similarity ranking for selecting the most relevant
      knowledge-base contexts before text generation.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transformer',
    icon: { key: 'ph--cpu--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.pluginAsset({
      pluginId: TransformerNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
