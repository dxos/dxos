//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Query, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';
import {
  EMAIL_EXTRACT_OPTIONS,
  type FactExtractor,
  type FactUnit,
  extractFactsUnitStage,
  messageSource,
  messageToDocument,
} from '@dxos/pipeline-email';
import { FactStore, extractDocFacts } from '@dxos/pipeline-rdf';
import { DerivedBinding, SyncBinding } from '@dxos/plugin-connector';
import { Cursor, Message } from '@dxos/types';

import { FactCommit } from '../../sync';
import { InboxOperation, type Mailbox } from '../../types';

/** Foreign-key namespace for the fact-indexing dedup set (distinct from provider message keys). */
const FACT_KEY_SOURCE = 'inbox.facts';

/**
 * Runs the cursored fact pipeline over a feed: dedup by cursor → extract facts → commit each page to
 * the {@link FactStore} while advancing the binding cursor. Extraction is injected (`extract`) so the
 * pipeline is unit-testable with a deterministic stub — no {@link AiService.AiService} required.
 */
export const runFactPipeline = (options: {
  readonly feed: Feed.Feed;
  readonly binding: DerivedBinding.DerivedBinding;
  readonly extract: FactExtractor;
  readonly pageSize: number;
}): Effect.Effect<{ processed: number; facts: number }, never, FactStore | Database.Service> =>
  Effect.gen(function* () {
    const { feed, binding, extract, pageSize } = options;
    const store = yield* FactStore;

    // D3 (workaround): the Phase-1 FactStore is in-memory, so a reload leaves it empty while the
    // persisted binding cursor survives — resuming from the cursor would then permanently skip every
    // message. Gate cursor resume on the store being non-empty: crawl from scratch when it is empty,
    // resume from the cursor otherwise. Removed once the store is durable (worker/OPFS SQLite).
    // D5: coarse for a space with multiple mailboxes — any mailbox's facts make the store non-empty,
    // so a second mailbox resumes from its own (empty) cursor as expected, but a re-added mailbox
    // would be considered already-crawled. Acceptable until the durable store lands.
    const priorFacts = yield* store.query({}).pipe(Effect.orElseSucceed(() => []));
    const hasFacts = priorFacts.length > 0;
    // Sources (== `messageSource` / the dedup foreign id) already indexed. The cursor's `< cursorKey`
    // fast-path drops strictly-older messages, but the newest message keys equal to the advanced
    // cursor, so it alone would re-extract. Dedup against the store by source to skip it too.
    const indexedSources = new Set(priorFacts.map((fact) => fact.attribution.source));
    // The cursor is materialized with the binding, so a missing one is a defect (mirrors SyncBinding.layer).
    const cursor = yield* Database.load(binding.cursor).pipe(Effect.orDie);
    const cursorKey = hasFacts ? Cursor.parseKey(cursor.value) : 0;

    let processed = 0;
    let facts = 0;
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    yield* Stream.fromIterable(messages).pipe(
      SyncBinding.dedupStage(
        'facts-dedup',
        (message: Message.Message) => messageSource(message),
        (message: Message.Message) => Date.parse(message.created),
      ),
      Stage.map('facts-source-dedup', (message: Message.Message) =>
        Effect.sync(() => (indexedSources.has(messageSource(message)) ? undefined : message)),
      ),
      extractFactsUnitStage(extract),
      Stage.map('tally', (unit: FactUnit) =>
        Effect.sync(() => {
          processed += 1;
          facts += unit.facts.length;
          return unit;
        }),
      ),
      Stream.grouped(pageSize),
      Pipeline.run({ sink: FactCommit.factsCommit }),
      // No `feed` in the layer options → DB-target path, empty dedup set (dedup by cursor key).
      Effect.provide(
        SyncBinding.layer({ binding, foreignKeySource: FACT_KEY_SOURCE, cursorKey, stats: { newMessages: 0 } }),
      ),
    );

    return { processed, facts };
  });

/**
 * Finds the {@link DerivedBinding} whose source is this feed, else creates one targeting the mailbox.
 * A mailbox owns exactly one feed, so at most one such binding exists per feed.
 */
const findOrCreateDerivedBinding = (
  db: Database.Database,
  feed: Feed.Feed,
  mailbox: Mailbox.Mailbox,
): Effect.Effect<DerivedBinding.DerivedBinding, never, Database.Service> =>
  Effect.gen(function* () {
    const existing = yield* Database.query(Query.select(Filter.id(feed.id)).sourceOf(DerivedBinding.DerivedBinding))
      .run;
    const found = existing.find((relation) => Relation.getSource(relation).id === feed.id);
    if (found) {
      return found;
    }
    const binding = DerivedBinding.make({ [Relation.Source]: feed, [Relation.Target]: mailbox });
    db.add(binding);
    return binding;
  });

const handler = InboxOperation.EnrichMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, pageSize = InboxOperation.DEFAULT_ENRICH_MAILBOX_PAGE_SIZE }) {
      const { db } = yield* Database.Service;
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const aiService = yield* AiService.AiService;

      const binding = yield* findOrCreateDerivedBinding(db, feed, mailbox);

      // Extract-only closure: derives facts via pipeline-rdf with the injected AiService without
      // persisting (FactCommit persists at commit time, so there is no double write).
      const extract: FactExtractor = (message) =>
        EffectEx.runPromise(
          extractDocFacts(messageToDocument(message), EMAIL_EXTRACT_OPTIONS).pipe(
            Effect.provideService(AiService.AiService, aiService),
          ),
        );

      return yield* runFactPipeline({ feed, binding, extract, pageSize });
    }),
  ),
  // Erase the inferred handler type so the default export is portably nameable in the emitted .d.ts.
  Operation.opaqueHandler,
);

export default handler;
