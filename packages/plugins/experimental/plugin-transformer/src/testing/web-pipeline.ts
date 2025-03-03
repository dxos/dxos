//
// Copyright 2025 DXOS.org
//

import { pipeline } from '@huggingface/transformers';

import { type EmbeddingOutput, RagPipeline } from './pipeline';

// TODO(burdon): Workers.
//  https://huggingface.co/docs/transformers.js/tutorials/react#step-3-design-the-user-interface
// TODO(burdon): WebGPT.
//  https://huggingface.co/docs/transformers.js/guides/webgpu

/**
 * Web-based implementation using Hugging Face transformers.
 */
export class WebRagPipeline extends RagPipeline {
  private embeddingModel: string;
  private textModel: string;

  constructor(embeddingModel = 'Xenova/all-MiniLM-L6-v2', textModel = 'Xenova/distilgpt2') {
    super();
    this.embeddingModel = embeddingModel;
    this.textModel = textModel;
  }

  protected async generateEmbeddings(text: string | string[]): Promise<EmbeddingOutput> {
    const embedding = await pipeline('feature-extraction', this.embeddingModel, {
      revision: 'main',
    });
    const result = await embedding(text, { pooling: 'mean', normalize: true });
    // Convert DataArray to number[]
    return { data: Array.from(result.data) };
  }

  protected async generateText(prompt: string) {
    const generator = await pipeline('text-generation', this.textModel, {
      revision: 'main',
    });
    return generator(prompt, {
      max_new_tokens: 50,
      num_return_sequences: 3,
      temperature: 0.7,
    });
  }
}
