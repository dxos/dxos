//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Filter, Query, Relation } from '@dxos/echo';
import { dispatch, fromExtractors } from '@dxos/extractor';
import { log } from '@dxos/log';
import { type Message } from '@dxos/types';

import { InboxResolver } from '../../services';
import { ExtractedFrom, InboxCapabilities, InboxOperation, Mailbox } from '../../types';

/**
 * Inbox bridge over the generic `@dxos/extractor` dispatcher. Builds the extractor registry from
 * the registered `ObjectExtractor` capabilities, runs `dispatch` (which selects an extractor,
 * runs its `extract`, and persists created objects + provenance relations), then applies any
 * returned tags to the owning Mailbox. Provenance uses the inbox `ExtractedFrom` relation; the
 * `Resolver` is the inbox domain resolver (Person-by-email, Organization-by-domain).
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractMessage> = InboxOperation.ExtractMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, source, extractorId }) {
      const extractors = yield* Capability.getAll(InboxCapabilities.ObjectExtractor);

      // Relation endpoints + tag refs require a LIVE, reactive ECHO proxy (an `isProxy` object).
      // This operation runs in a separate process, so `source` arrives as a snapshot; re-resolve
      // it from the space db via `getObjectById` (a live proxy, or undefined). NOTE: messages
      // stored in a Mailbox feed (a Queue) are NOT space-db objects and resolve to non-reactive
      // decoded objects, which ECHO rejects as relation endpoints ("target must be an ECHO
      // object"). So for feed-stored messages we skip provenance + tagging (with a warning) rather
      // than crash. Relating extracted objects back to feed messages needs follow-up support for
      // relations whose endpoint is a queue item.
      const live = db.getObjectById(source.id);
      const sourceIsLive = live !== undefined;
      if (!sourceIsLive) {
        log.warn('extract: source is not a live space-db object; skipping provenance + tags', {
          sourceId: source.id,
        });
      }

      const outcome = yield* dispatch(
        { db, source: live ?? source, extractorId },
        {
          provenance: ({ source: from, object, extractorId: id, extractedAt, confidence }) =>
            sourceIsLive
              ? ExtractedFrom.make({
                  [Relation.Source]: object,
                  [Relation.Target]: from,
                  extractorId: id,
                  extractedAt,
                  confidence,
                })
              : undefined,
        },
      ).pipe(
        Effect.provide(fromExtractors(extractors)),
        Effect.provide(InboxResolver.Live),
        Effect.provide(Database.layer(db)),
      );

      const result = outcome.result;

      // Apply tags to the (live) source message via its owning Mailbox.
      if (sourceIsLive && result?.tags && result.tags.length > 0) {
        const mailboxes = yield* Effect.promise(() => db.query(Filter.type(Mailbox.Mailbox)).run());
        const owningMailbox = yield* Effect.promise(async () => {
          for (const candidate of mailboxes) {
            const feed = await candidate.feed?.tryLoad();
            if (!feed) {
              continue;
            }
            const found = await db.query(Query.select(Filter.id(source.id)).from(feed)).run();
            if (found.length > 0) {
              return candidate;
            }
          }
          return mailboxes[0];
        });
        if (owningMailbox) {
          for (const tag of result.tags) {
            Mailbox.applyTag(owningMailbox, tag, live as Message.Message);
          }
        }
      }

      // Flush (with index update) so a subsequent extraction's create-or-update queries — segment
      // by (number, depart-date) and Trip by Booking confirmation code (PNR) — observe the objects
      // this run persisted. Without it, repeated extraction spawns duplicate Trips instead of
      // appending segments to the existing one.
      yield* Effect.promise(() => db.flush({ indexes: true }));

      return {
        extractorId: outcome.extractorId,
        created: result?.created.length ?? 0,
        updated: result?.updated?.length ?? 0,
        summary: result?.summary,
      };
    }),
  ),
);

export default handler;
