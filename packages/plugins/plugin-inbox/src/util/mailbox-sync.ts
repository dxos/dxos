//
// Copyright 2026 DXOS.org
//

/**
 * Shared helpers used by both Gmail and JMAP Mail sync operations.
 *
 * Each sync follows the same high-level structure:
 *   1. Load the feed + resolve the tag index.
 *   2. Build a dedup set of already-synced foreign ids.
 *   3. Fetch new messages from the provider.
 *   4. Append each batch: write to feed, apply provider tags, run on-arrival extractors.
 *
 * The provider-specific parts (session discovery, query API, mapper) stay in each sync file.
 */

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { type Cursor } from '@dxos/cursor';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { isAiServiceUnavailable } from '../operations/extractor';
import { InboxCapabilities, InboxOperation, type Mailbox } from '../types';

/** Read `syncBackDays` and `filter` from the binding options (opaque record). */
export const readBindingOptions = (binding: Cursor.ExternalCursor) => {
  const raw = binding.spec.options;
  if (!raw || typeof raw !== 'object') {
    return { syncBackDays: undefined as undefined | number, filter: undefined as undefined | string };
  }

  // Reject NaN/Infinity/negative — these feed `subDays`, which would otherwise yield an invalid date.
  const syncBackDays = raw.syncBackDays;
  return {
    syncBackDays:
      typeof syncBackDays === 'number' && Number.isFinite(syncBackDays) && syncBackDays >= 0 ? syncBackDays : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
  };
};

/**
 * Runs configured auto-on-arrival extractors for a batch of just-synced messages. Selects the
 * highest-confidence extractor that exceeds the mailbox threshold and invokes
 * {@link InboxOperation.ExtractMessage}. Failures are swallowed — the AI service may be absent
 * during startup and will catch up on the next sync.
 */
export const runOnArrivalExtractors = (mailbox: Mailbox.Mailbox, messages: readonly Message.Message[]) =>
  Effect.gen(function* () {
    const extractorsConfig = mailbox.extractors;
    if (!extractorsConfig || extractorsConfig.enabled.length === 0) {
      return;
    }
    const extractors = yield* Capability.getAll(InboxCapabilities.ObjectExtractor);
    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return;
    }
    for (const message of messages) {
      let best: { extractor: (typeof extractors)[number]; confidence: number } | undefined;
      for (const extractor of extractors) {
        if (!extractorsConfig.enabled.includes(extractor.id)) {
          continue;
        }
        let result;
        try {
          result = extractor.match(message);
        } catch (err) {
          log.warn('auto-on-arrival match failed', { err, extractorId: extractor.id, messageId: message.id });
          continue;
        }
        if (!result.matched) {
          continue;
        }
        const confidence = result.confidence ?? 0;
        if (confidence >= extractorsConfig.threshold && (!best || confidence > best.confidence)) {
          best = { extractor, confidence };
        }
      }
      if (best) {
        yield* Operation.invoke(
          InboxOperation.ExtractMessage,
          { source: message, extractorId: best.extractor.id },
          { spaceId: db.spaceId },
        ).pipe(
          Effect.catchAll((err) => {
            // The AI service can be momentarily absent from the process-manager LayerStack during
            // startup. Treat that as a deferrable skip — a later sync re-attempts.
            if (isAiServiceUnavailable(err)) {
              log.info('auto-on-arrival extract skipped: AI service not ready', { messageId: message.id });
            } else {
              log.warn('auto-on-arrival extract failed', { err, messageId: message.id });
            }
            return Effect.void;
          }),
        );
      }
    }
  });

/**
 * Pipeline stage wrapping {@link runOnArrivalExtractors}: runs the mailbox's configured on-arrival
 * extractors (AI and others) for each item's message, passing the item through unchanged.
 * Self-gating: a no-op when the mailbox has no extractors enabled. Sender→contact extraction is
 * handled unconditionally by `@dxos/pipeline-email`'s `EmailStage.extractContacts`; this stage
 * covers the remaining, config-gated extractors.
 *
 * TODO(wittjosiah): Factor these extractors out into their own downstream pipeline.
 */
export const onArrivalExtractors =
  (mailbox: Mailbox.Mailbox) =>
  <In extends { readonly message: Message.Message }, E, R>(
    self: Stream.Stream<In, E, R>,
  ): Stream.Stream<In, E, R | Capability.Service | Operation.Service> =>
    Stage.map('on-arrival-extractors', (item: In) =>
      runOnArrivalExtractors(mailbox, [item.message]).pipe(Effect.as(item)),
    )(self);
