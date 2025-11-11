//
// Copyright 2025 DXOS.org
//

import { defineFunction } from '@dxos/functions';

import { ExtractionInput, ExtractionOutput } from '../extraction';

/**
 * Named Entity Recognition model
 */
// TODO(mykola): Make it use vector index to query objects and not pass objects as input.
export const extractionNerFunction = defineFunction({
  key: 'dxos.org/function/extraction/extract-entities',
  name: 'Extract Entities',
  description: 'Extracts named entities from a text',
  inputSchema: ExtractionInput,
  outputSchema: ExtractionOutput,
  handler: async ({ data: { message, options }, context }) => {
    throw new Error('not implemented');
    // log.info('input', { message, options });
    // const startTime = performance.now();
    // const { db } = context.getService(DatabaseService);
    // const { extractFullEntities } = await import('./named-entity-recognition');

    // const entitiesPromise = Promise.all(
    //   message.blocks.map(async (block) => {
    //     invariant(block._tag === 'transcript' || block._tag === 'text');
    //     return extractFullEntities(block.text);
    //   }),
    // ).then((entities) => entities.flat());
    // const entities = options?.timeout ? await asyncTimeout(entitiesPromise, options.timeout) : await entitiesPromise;

    // log.info('entities', { entities });
    // const quoteReferences = await findQuotes(
    //   entities.map((entity) => entity.word),
    //   db,
    // );

    // const blocksWithReferences = message.blocks.map((block) => {
    //   invariant(block._tag === 'transcript' || block._tag === 'text');
    //   return { ...block, text: insertReferences(block._tag, quoteReferences) };
    // });

    // const messageWithReferences = create(Message.Message, {
    //   ...message,
    //   blocks: blocksWithReferences,
    // });

    // log.info('output', { messageWithReferences });
    // return {
    //   message: messageWithReferences,
    //   timeElapsed: performance.now() - startTime,
    // };
  },
});
