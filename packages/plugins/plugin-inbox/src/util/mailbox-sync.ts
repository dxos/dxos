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

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type SyncBinding } from '@dxos/plugin-connector';
import { Tagging } from '@dxos/schema';
import { Message } from '@dxos/types';

import { isAiServiceUnavailable } from '../operations/extractor';
import { InboxCapabilities, InboxOperation, type Mailbox } from '../types';

/** Read `syncBackDays` and `filter` from the binding options (opaque record). */
export const readBindingOptions = (binding: SyncBinding.SyncBinding) => {
  const raw = binding.options;
  if (!raw || typeof raw !== 'object') {
    return { syncBackDays: undefined as undefined | number, filter: undefined as undefined | string };
  }
  return {
    syncBackDays: typeof raw.syncBackDays === 'number' ? raw.syncBackDays : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
  };
};

/**
 * Collects the set of foreign ids (keyed by `foreignKeySource`) from the most recent `maxScan`
 * feed messages. Used to skip already-synced messages (dedup). Pure over an already-queried list so
 * callers that also need the messages (e.g. for a last-synced cursor) avoid a second feed query.
 */
export const collectForeignIds = (
  messages: readonly Message.Message[],
  foreignKeySource: string,
  maxScan: number,
): Set<string> =>
  new Set(
    messages.slice(-maxScan).flatMap((message) =>
      Obj.getMeta(message)
        .keys.filter((key) => key.source === foreignKeySource)
        .map((key) => key.id),
    ),
  );

/**
 * Appends a batch of messages to the feed, applies provider-folder tags via `getTagUris`, and runs
 * on-arrival extractors. Used by both Gmail sync (label tag map) and JMAP Mail sync (folder tag map).
 */
export const appendBatchToFeed = (
  feed: Feed.Feed,
  mailbox: Mailbox.Mailbox,
  messages: Message.Message[],
  /** Returns the tag URIs to apply for the given message (e.g. one per Gmail label / JMAP folder). */
  getTagUris: (message: Message.Message) => readonly string[],
) =>
  Effect.gen(function* () {
    yield* Feed.append(feed, messages);
    for (const message of messages) {
      for (const uri of getTagUris(message)) {
        Tagging.set(message, uri, { index: mailbox.tags.target });
      }
    }
    yield* runOnArrivalExtractors(mailbox, messages);
  });

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
          { db, source: message, extractorId: best.extractor.id },
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
