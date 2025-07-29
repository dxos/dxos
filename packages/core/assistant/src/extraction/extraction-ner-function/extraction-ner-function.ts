//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Fix.
// @ts-nocheck

import { asyncTimeout } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { extractFullEntities } from './named-entity-recognition';
import { ExtractionInput, ExtractionOutput } from '../extraction';
import { findQuotes, insertReferences } from '../quotes';

// TODO(mykola): Make it use vector index to query objects and not pass objects as input.
export const extractionNerFn = defineFunction({
  description: 'Extracts named entities from a text',
  inputSchema: ExtractionInput,
  outputSchema: ExtractionOutput,
  handler: async ({ data: { message, options }, context }) => {
    log.info('input', { message, options });
    const startTime = performance.now();
    const { db } = context.getService(DatabaseService);

    const entitiesPromise = Promise.all(
      message.blocks.map(async (block) => {
        invariant(block._tag === 'transcript' || block._tag === 'text', 'Block must have text');
        return extractFullEntities(block.text);
      }),
    ).then((entities) => entities.flat());
    const entities = options?.timeout ? await asyncTimeout(entitiesPromise, options.timeout) : await entitiesPromise;
    log.info('entities', { entities });
    const quoteReferences = await findQuotes(
      entities.map((entity) => entity.word),
      db,
    );
    const blocksWithReferences = message.blocks.map((block, i) => {
      invariant(block._tag === 'transcript' || block._tag === 'text', 'Block must have text');
      return { ...block, text: insertReferences(block._tag, quoteReferences) };
    });
    const messageWithReferences = create(DataType.Message, {
      ...message,
      blocks: blocksWithReferences,
    });

    log.info('output', { messageWithReferences });

    return {
      message: messageWithReferences,
      timeElapsed: performance.now() - startTime,
    };
  },
});
