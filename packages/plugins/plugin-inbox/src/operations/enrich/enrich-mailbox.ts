//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import {
  EMAIL_EXTRACT_OPTIONS,
  type FactExtractor,
  extractFactsUnitStage,
  messageSource,
  messageToDocument,
} from '@dxos/pipeline-email';
import { FactStore, type RDF, extractDocFacts } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import { FeedCursors, type FeedCursorsApi, InboxOperation } from '../../types';

/**
 * Runs the cursored fact pipeline over a feed: dedup → extract facts → commit each page to the
 * {@link FactStore} while advancing the feed's cursor. Extraction is injected (`extract`) so the
 * pipeline is unit-testable with a deterministic stub — no {@link AiService.AiService} required.
 *
 * Dedup is by the feed's high-water cursor (a coarse `key < cursorKey` skip) plus the set of message
 * sources already in the store (the precise idempotency backstop). Both the store and the cursor are
 * in-memory and share a session lifetime, so no store-emptiness gate is needed.
 */
export const runFactPipeline = (options: {
  readonly feed: Feed.Feed;
  readonly cursors: FeedCursorsApi;
  readonly extract: FactExtractor;
  readonly pageSize: number;
}): Effect.Effect<{ processed: number; facts: number }, never, FactStore | Database.Service> =>
  Effect.gen(function* () {
    const { feed, cursors, extract, pageSize } = options;
    const store = yield* FactStore;

    // Sources (== `messageSource`) already indexed — the precise skip; the cursor is only a coarse
    // prefilter (the newest message keys equal to the advanced cursor, so `< cursorKey` alone would
    // re-extract it).
    const priorFacts = yield* store.query({}).pipe(Effect.orElseSucceed(() => []));
    const indexedSources = new Set(priorFacts.map((fact) => fact.attribution.source));

    // NOTE(workaround): the cursor key is `message.created` (epoch-ms) because ECHO's native feed
    // cursor is unimplemented (`Feed.cursor` is stubbed). Replace with the native queue sequence when
    // available.
    let cursorKey = cursors.get(feed.id);

    let processed = 0;
    let facts = 0;
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    yield* Stream.fromIterable(messages).pipe(
      Stage.map('facts-dedup', (message: Message.Message) =>
        Effect.sync(() =>
          Date.parse(message.created) < cursorKey || indexedSources.has(messageSource(message)) ? undefined : message,
        ),
      ),
      extractFactsUnitStage(extract),
      Stream.grouped(pageSize),
      Pipeline.run({
        sink: (page) =>
          Effect.gen(function* () {
            const units = Chunk.toReadonlyArray(page);
            if (units.length === 0) {
              return;
            }

            const pageFacts = units.flatMap((unit) => unit.facts);
            if (pageFacts.length > 0) {
              // A fact-store write failure is fatal to the run (not a recoverable per-page error).
              yield* store.putFacts(pageFacts).pipe(Effect.orDie);
            }

            processed += units.length;
            facts += pageFacts.length;
            cursorKey = Math.max(cursorKey, ...units.map((unit) => unit.key));
            cursors.advance(feed.id, cursorKey);
          }),
      }),
    );

    return { processed, facts };
  });

const handler = InboxOperation.EnrichMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      mailbox: mailboxRef,
      pageSize = InboxOperation.DEFAULT_ENRICH_MAILBOX_PAGE_SIZE,
      model,
      provider,
      strict,
    }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const aiService = yield* AiService.AiService;
      const cursors = yield* FeedCursors;

      // Extract options: the email rules plus optional model/provider/strict overrides so callers can
      // target a local model (e.g. ollama, strict:false) instead of the default edge Claude model.
      const extractOptions: RDF.ExtractOptions = {
        ...EMAIL_EXTRACT_OPTIONS,
        ...(model !== undefined ? { model } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(strict !== undefined ? { strict } : {}),
      };

      // Extract-only closure: derives facts via pipeline-rdf with the injected AiService without
      // persisting (the sink persists per page, so there is no double write).
      const extract: FactExtractor = (message) =>
        EffectEx.runPromise(
          extractDocFacts(messageToDocument(message), extractOptions).pipe(
            Effect.provideService(AiService.AiService, aiService),
          ),
        );

      return yield* runFactPipeline({ feed, cursors, extract, pageSize });
    }),
  ),
  // Erase the inferred handler type so the default export is portably nameable in the emitted .d.ts.
  Operation.opaqueHandler,
);

export default handler;
