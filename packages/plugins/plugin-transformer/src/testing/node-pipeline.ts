//
// Copyright 2025 DXOS.org
//

import { pipeline as xenovaPipeline } from '@xenova/transformers';

import { type EmbeddingOutput, RagPipeline } from './pipeline';

/**
 * Node implementation using Xenova transformers.
 */
export class NodeRagPipeline extends RagPipeline {
  private embeddingModel: string;
  private textModel: string;

  constructor(embeddingModel = 'Xenova/all-MiniLM-L6-v2', textModel = 'Xenova/t5-small') {
    super();
    this.embeddingModel = embeddingModel;
    this.textModel = textModel;
  }

  protected async generateEmbeddings(text: string | string[]): Promise<EmbeddingOutput> {
    const embedding = await xenovaPipeline('feature-extraction', this.embeddingModel);
    const result = await embedding(text, { pooling: 'mean', normalize: true });
    return { data: Array.from(result.data) };
  }

  protected async generateText(prompt: string) {
    const generator = await xenovaPipeline('text2text-generation', this.textModel);
    return generator(prompt, {
      num_return_sequences: 1,
      max_new_tokens: 50,
    });
  }
}
