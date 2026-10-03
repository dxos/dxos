//
// Copyright 2026 DXOS.org
//

/**
 * On-arrival extraction hooks for freshly-synced mail. Provider-agnostic: the sync harness
 * (`#sync`) owns the pipeline, this owns the config-gated AI step it runs over each batch.
 */

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { InboxCapabilities, InboxOperation, Mailbox } from '#types';

import { isAiServiceUnavailable } from '../operations/extractor/index.ts';

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
          Effect.catch((err) => {
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
