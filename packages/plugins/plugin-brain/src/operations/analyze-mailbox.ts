//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { PROGRESS_STATUS_COMPLETE } from '@dxos/app-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EMAIL_EXTRACT_OPTIONS, type FactExtractor, messageToDocument, runFactPipeline } from '@dxos/pipeline-email';
import { type RDF, extractDocFacts } from '@dxos/pipeline-rdf';
import * as FeedCursor from '@dxos/plugin-inbox/FeedCursor';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

import { BrainOperation } from '#types';

/**
 * Thin mailbox wrapper over the feed-generic `runFactPipeline` (in `@dxos/pipeline-email`): resolves
 * the Mailbox to its backing feed and persisted progress cursor, builds the extract closure from the
 * injected `AiService`, and runs the cursored fact pipeline. All facts/feed machinery is
 * mailbox-agnostic; only the input shape (`Ref<Mailbox>`) and the feed/cursor lookup are
 * mailbox-specific.
 */
const handler = BrainOperation.AnalyzeMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      mailbox: mailboxRef,
      pageSize = BrainOperation.DEFAULT_ANALYZE_MAILBOX_PAGE_SIZE,
      model,
      provider,
      strict,
    }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const cursor = yield* FeedCursor.findOrCreateAnalyzeCursor(mailbox);
      const aiService = yield* AiService.AiService;

      // Live progress via trace `status.update` events (`#analyze` key), projected into the runtime
      // ProgressRegistry — same seam as mail sync and the process pipeline. The pipeline's first
      // `onProgress` delivers the exact pending count, so the meter is determinate.
      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createFactsProgressKey(mailbox);
      let total: number | undefined;
      const reportStatus = (patch: { message?: string; current?: number; total?: number } = {}) => {
        total = patch.total ?? total;
        traceWriter.write(Trace.StatusUpdate, {
          message: patch.message ?? mailbox.name ?? 'Mailbox',
          progress: { key: progressKey, current: patch.current ?? 0, total },
        });
      };
      reportStatus({ current: 0 });

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

      const result = yield* runFactPipeline({
        feed,
        cursor,
        pageSize,
        extract,
        onProgress: ({ processed, total }) => reportStatus({ current: processed, total }),
      });
      reportStatus({ message: PROGRESS_STATUS_COMPLETE });
      return result;
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
