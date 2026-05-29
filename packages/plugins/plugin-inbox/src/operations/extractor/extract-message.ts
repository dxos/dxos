//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, type Obj, Query, Relation } from '@dxos/echo';
import { dispatch, fromExtractors } from '@dxos/extractor';
import { EchoURI } from '@dxos/keys';
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
      // process, so `source` arrives as a deserialized snapshot. Resolve the live proxy AND the
      // owning Mailbox: most inbox messages live in a Mailbox feed (a Queue), so resolve them via
      // the graph ref-resolver with feed context (the documented way to load a live queue item) —
      // `db.query(...).from(feed)` returns snapshots, which are not valid relation targets. Fall
      // back to a direct space-db lookup for non-feed messages. When nothing resolves, extraction
      // still persists objects but provenance + tagging are skipped (with a warning).
      const messageUri = EchoURI.make({ spaceId: db.spaceId, objectId: source.id });
      const mailboxes = yield* Effect.promise(() => db.query(Filter.type(Mailbox.Mailbox)).run());
      const resolved = yield* Effect.promise(async () => {
        for (const candidate of mailboxes) {
          const feed = await candidate.feed?.tryLoad();
          if (!feed) {
            continue;
          }
          const inFeed = await db.query(Query.select(Filter.id(source.id)).from(feed)).run();
          if (inFeed.length === 0) {
            continue;
          }
          const feedUri = Feed.getQueueUri(feed);
          const message = feedUri
            ? ((await db.graph
                .createRefResolver({ context: { space: db.spaceId, feed: feedUri } })
                .resolve(messageUri)) as Obj.Any | undefined)
            : undefined;
          return { mailbox: candidate, message };
        }
        return { mailbox: mailboxes[0], message: db.getObjectById(source.id) as Obj.Any | undefined };
      });
      const owningMailbox = resolved.mailbox;
      const live = resolved.message;
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
      if (sourceIsLive && owningMailbox && result?.tags && result.tags.length > 0) {
        for (const tag of result.tags) {
          Mailbox.applyTag(owningMailbox, tag, live as Message.Message);
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
