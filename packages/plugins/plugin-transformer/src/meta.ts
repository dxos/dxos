//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.transformer'),
  name: 'Transformer',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
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
  icon: 'ph--cpu--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transformer',
  tags: ['labs'],
};
