//
// Copyright 2025 DXOS.org
//

import { AutoTokenizer, pipeline } from '@huggingface/transformers';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { NodeRagPipeline } from './node-pipeline';

describe.skip('transformers', () => {
  test('tokenizer', async () => {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/bert-base-uncased');
    const tokens = await tokenizer('I love transformers!');
    log.info('tokens', { tokens });
  });

  test('sentiment', async ({ expect }) => {
    const sentiment = await pipeline('sentiment-analysis');
    const result = await sentiment('I love transformers!');
    expect(result[0]).to.include({ label: 'POSITIVE' });
    log.info('result', { result });
  }, 30_000);

  test('run embeddings', async ({ expect }) => {
    const content = [
      'create map of london',
      'create function to generate the fibonacci sequence',
      'create a table with',
    ];

    const embedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await embedding(content.join('\n'), { pooling: 'mean', normalize: true });
    log.info('output', { output });
  });

  test('generation', async ({ expect }) => {
    const generator = await pipeline('text-generation', 'Xenova/gpt2');
    const output = await generator('create');
    log.info('output', { output });
  });
});

/**
 * Note: The RAG pipeline is designed for browser environments with WebGPU support.
 * The Xenova transformers library primarily targets browser environments and may not
 * work correctly in Node.js/Vitest testing environments.
 *
 * To test this functionality:
 * 1. Use in a browser environment
 * 2. Ensure WebGPU is available
 * 3. Consider using a test framework that supports browser environments (like Playwright or Cypress)
 */
describe.skip('rag pipeline', () => {
  const knowledgeBase = [
    //
    'create a new table.',
    'create a new kanban.',
    'create a map of london.',
    'create a function to generate the fibonacci sequence.',
  ];

  test('prediction pipeline', async ({ expect }) => {
    const pipeline = new NodeRagPipeline();
    const result = await pipeline.generateCompletions('create a function', knowledgeBase);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    log.info('result', { result });
  }, 120_000);

  test('semantic similarity with local pipeline', async ({ expect }) => {
    const semanticKnowledgeBase = [
      'The quick brown fox jumps over the lazy dog.',
      'JavaScript is a programming language.',
      'Python is used for data science.',
    ];

    const pipeline = new NodeRagPipeline();
    const result = await pipeline.generateCompletions('What can I use for coding?', semanticKnowledgeBase);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    log.info('result', { result });
  }, 120_000);
});
