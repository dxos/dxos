//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EMAIL_EXTRACT_OPTIONS, type FactExtractor, messageToDocument, runFactPipeline } from '@dxos/pipeline-email';
import { FeedCursors, type RDF, extractDocFacts } from '@dxos/pipeline-rdf';

import { InboxOperation } from '../../types';

/**
 * Thin mailbox wrapper over the feed-generic `runFactPipeline` (in `@dxos/pipeline-email`): resolves
 * the Mailbox to its backing feed, builds the extract closure from the injected `AiService`, and runs
 * the cursored fact pipeline. All facts/feed machinery is mailbox-agnostic; only the input shape
 * (`Ref<Mailbox>`) and the feed lookup are mailbox-specific.
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
  Operation.opaqueHandler,
);

export default handler;
