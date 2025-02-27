//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

/**
 * Types for embeddings and model outputs.
 */
export type EmbeddingOutput = {
  data: number[]; // Simplified to number[] since we'll convert all arrays.
};

/**
 * Base class for RAG pipeline implementations.
 */
export abstract class RagPipeline {
  /**
   * Generate embeddings for a text or array of texts.
   */
  protected abstract generateEmbeddings(text: string | string[]): Promise<EmbeddingOutput>;

  /**
   * Generate text completions given a prompt.
   */
  protected abstract generateText(prompt: string): Promise<any>;

  /**
   * Calculate cosine similarity between two vectors.
   */
  protected cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
    const aArray = Array.from(a);
    const bArray = Array.from(b);
    const dotProduct = aArray.reduce((sum, val, i) => sum + val * bArray[i], 0);
    const magnitudeA = Math.sqrt(aArray.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(bArray.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Generate completions using the RAG pipeline.
   */
  async generateCompletions(input: string, knowledgeBase: string[]) {
    // Generate embeddings for input and knowledge base.
    const inputEmbedding = await this.generateEmbeddings(input);
    const knowledgeEmbeddings = await Promise.all(knowledgeBase.map((text) => this.generateEmbeddings(text)));

    // Calculate similarity scores.
    const similarities = knowledgeEmbeddings.map((emb) => this.cosineSimilarity(inputEmbedding.data, emb.data));

    // Get top 3 most relevant contexts.
    const topContexts = similarities
      .map((score, idx) => ({ score, text: knowledgeBase[idx] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.text);

    // Generate completions using retrieved context.
    // const prompt = `
    // Given the history and list of commands below, complete the following user input.
    // History: ''
    // Context: ${topContexts.join('\n')}
    // User input: "${input}"
    // `.trim();

    const prompt = 'hello';

    // `Context: ${topContexts.join('\n')}\nQuery: ${input}\nResponse:`;
    log.info('prompt', { prompt });
    return this.generateText(prompt);
  }
}
