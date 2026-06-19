//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { enrichTranscriptMessage } from '@dxos/assistant/extraction';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { TranscriptOperation } from '../types';

/**
 * Extracts proper nouns from a transcript message and links them to objects in the space via
 * full-text search, rewriting the text with reference links.
 */
const handler: Operation.WithHandler<typeof TranscriptOperation.EnrichMessage> = TranscriptOperation.EnrichMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ message }) {
      const { db } = yield* Database.Service;
      const enriched = yield* enrichTranscriptMessage(message, { db });
      return { message: enriched };
    }),
  ),
);

export default handler;
