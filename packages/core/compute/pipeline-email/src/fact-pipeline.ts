//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Database, Feed, Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { FactCommit, FactStore, type FeedCursorsApi } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import {
  EmailPipelineCtx,
  type FactExtractor,
  type FactIndexer,
  type Stats,
  emptyStats,
  extractFactsStage,
  extractFactsUnitStage,
  messageSource,
  statsStage,
} from './stages';

export type EmailFactPipelineOptions = {
  /** ECHO space database, required by `EmailPipelineCtx` even though this assembly never writes to it. */
  readonly db: Database.Database;
  /** Persists one message's facts to the fact substrate (a closure over a `FactStore`). */
  readonly indexFacts: FactIndexer;
};

export type EmailFactPipelineResult = {
  readonly messages: Message.Message[];
  readonly stats: Stats;
};

export const EmailFactPipeline = {
  /**
   * Facts-only assembly of the email stages over a batch of messages: stats → extract-facts. Omits
   * summarize, extract-contacts, and {@link buildThreads} from {@link EmailPipeline}, so it needs no
   * `AiService` and never writes to `db`. The cursored `AnalyzeMailbox` operation (in plugin-inbox)
   * covers the same fact-extraction concern incrementally, via a sibling facts-returning stage
   * (`extractFactsUnitStage`) that commits pages atomically with a cursor advance instead of indexing
   * in-stage; this batch variant is for one-shot runs over an already-collected set of messages.
   */
  run: (
    messages: readonly Message.Message[],
    options: EmailFactPipelineOptions,
  ): Effect.Effect<EmailFactPipelineResult> =>
    Effect.gen(function* () {
      const stats = emptyStats();
      const collected: Message.Message[] = [];
      yield* Stream.fromIterable(messages).pipe(
        statsStage,
        extractFactsStage(options.indexFacts),
        Pipeline.run({ sink: (message) => Effect.sync(() => collected.push(message)) }),
        Effect.provideService(EmailPipelineCtx, { db: options.db, stats, summaries: [] }),
      );

      return { messages: collected, stats };
    }),
};

/**
 * Runs the cursored fact pipeline over a feed: dedup → extract facts → commit each page to the
 * {@link FactStore} while advancing the feed's cursor. Extraction is injected (`extract`) so the
 * pipeline is unit-testable with a deterministic stub — no `AiService` required. Feed-generic (the
 * mailbox `AnalyzeMailbox` operation is a thin wrapper that resolves a Mailbox to its feed).
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
  /** In-flight parallelism for the per-message extraction stage (defaults to 1 = serial). */
  readonly concurrency?: number;
}): Effect.Effect<{ processed: number; facts: number }, never, FactStore | Database.Service> =>
  Effect.gen(function* () {
    const { feed, cursors, extract, pageSize, concurrency = 1 } = options;
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
    log.info('analyze: pipeline start', {
      messages: messages.length,
      cursorKey,
      indexed: indexedSources.size,
      pageSize,
    });
    yield* Stream.fromIterable(messages).pipe(
      Stage.map('facts-dedup', (message: Message.Message) =>
        Effect.sync(() =>
          Date.parse(message.created) < cursorKey || indexedSources.has(messageSource(message)) ? undefined : message,
        ),
      ),
      extractFactsUnitStage(extract, concurrency),
      // Observability stage: confirms units flow through and how many facts each carries.
      Stage.map('facts-log', (unit: FactCommit.FactUnit) =>
        Effect.sync(() => {
          log.info('analyze: extracted unit', { foreignId: unit.foreignId, key: unit.key, facts: unit.facts.length });
          return unit;
        }),
      ),
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

            // Terminal progress log (one line per committed page): the only live signal between
            // pipeline start and done, so a long run's advance is observable rather than silent.
            log.info('analyze: committed page', {
              page: units.length,
              pageFacts: pageFacts.length,
              processed,
              facts,
              cursorKey,
            });
          }),
      }),
    );

    log.info('analyze: pipeline done', { processed, facts });
    return { processed, facts };
  });
