//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Cursor } from '@dxos/cursor';
import { Database, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EMAIL_EXTRACT_OPTIONS, type FactExtractor, messageToDocument, runFactPipeline } from '@dxos/pipeline-email';
import { type RDF, extractDocFacts } from '@dxos/pipeline-rdf';

import { InboxOperation, type Mailbox } from '../../types';

/**
 * Finds the persisted feed-to-feed {@link Cursor} tracking this mailbox's fact-extraction progress
 * (`spec.source` = the mailbox's feed, `spec.target` = the mailbox itself — there is no dedicated
 * "fact consumer" ECHO object, so the mailbox stands in as the association anchor), creating one on
 * first analysis. Persisted so progress survives a reload.
 */
const findOrCreateFeedCursor = (mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const feedRef = mailbox.feed;
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const existing = cursors.find((cursor) => cursor.spec.kind === 'feed' && cursor.spec.source.uri === feedRef.uri);
    if (existing) {
      return existing;
    }
    return yield* Database.add(Cursor.makeFeed({ source: feedRef, target: Ref.make(mailbox) }));
  });

/**
 * Thin mailbox wrapper over the feed-generic `runFactPipeline` (in `@dxos/pipeline-email`): resolves
 * the Mailbox to its backing feed and persisted progress cursor, builds the extract closure from the
 * injected `AiService`, and runs the cursored fact pipeline. All facts/feed machinery is
 * mailbox-agnostic; only the input shape (`Ref<Mailbox>`) and the feed/cursor lookup are
 * mailbox-specific.
 */
const handler = InboxOperation.AnalyzeMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      mailbox: mailboxRef,
      pageSize = InboxOperation.DEFAULT_ANALYZE_MAILBOX_PAGE_SIZE,
      model,
      provider,
      strict,
    }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const cursor = yield* findOrCreateFeedCursor(mailbox);
      const aiService = yield* AiService.AiService;

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

      return yield* runFactPipeline({ feed, cursor, extract, pageSize });
    }),
  ),
  // Erase the inferred handler type so the default export is portably nameable in the emitted .d.ts.
  Operation.opaqueHandler,
);

export default handler;
