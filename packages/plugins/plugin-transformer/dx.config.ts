//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.transformer',
    name: 'Transformer',
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
});
