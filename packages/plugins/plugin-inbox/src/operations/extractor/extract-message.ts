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

      // Relation endpoints + tag refs require a LIVE ECHO proxy. This operation runs in a separate
      // process, so `source` arrives as a deserialized snapshot; re-resolve a live proxy via the
      // space db (`getObjectById`). For feed/queue-stored messages this returns undefined — the
      // operation runtime exposes no live queue handle — so extraction still persists objects but
      // provenance + tagging are skipped (with a warning) rather than throwing "target must be an
      // ECHO object". TODO(burdon): attach provenance/tags in the caller where the message proxy
      // is live (the worker cannot resolve feed items to live proxies).
      const live = db.getObjectById(source.id);
      const sourceIsLive = live !== undefined;
      if (!sourceIsLive) {
        log.warn('extract: source did not resolve to a live object; skipping provenance + tags', {
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
