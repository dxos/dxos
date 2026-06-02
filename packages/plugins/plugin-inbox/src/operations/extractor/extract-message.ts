//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Relation } from '@dxos/echo';
import { dispatch, fromExtractors } from '@dxos/extractor';
import { type Message } from '@dxos/types';

import { InboxResolver } from '../../services';
import { ExtractedFrom, InboxCapabilities, InboxOperation, Mailbox } from '../../types';

/**
 * Inbox bridge over the generic `@dxos/extractor` dispatcher. Builds the extractor registry from
 * the registered `ObjectExtractor` capabilities, runs `dispatch` (which selects an extractor,
 * runs its `extract`, and persists created objects + provenance relations), then applies any
 * returned tags to the owning Mailbox.
 *
 * Provenance has two paths. For a live space-db source it uses an `ExtractedFrom` relation
 * (Trip → message). Feed-stored messages are immutable Queue items that ECHO cannot use as
 * relation/Ref endpoints, so their association is recorded on the mutable Mailbox
 * (`Mailbox.recordExtraction`, keyed by message id → extracted object ids) — the same pattern
 * `tags` uses — and surfaced by `MessageHeader`.
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractMessage> = InboxOperation.ExtractMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, source, extractorId }) {
      const extractors = yield* Capability.getAll(InboxCapabilities.ObjectExtractor);

      // A LIVE, reactive ECHO proxy (`isProxy`) is needed to use the source as a relation/tag
      // endpoint. The operation runs in a separate process, so `source` is a snapshot; re-resolve
      // it from the space db via `getObjectById` (live proxy, or undefined for feed-stored items).
      const live = db.getObjectById<Message.Message>(source.id);
      const sourceIsLive = live !== undefined;

      // Resolve the owning Mailbox (feed membership via the source id; no live proxy required).
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

      const outcome = yield* dispatch(
        { db, source: live ?? source, extractorId },
        {
          // Provenance relation only when the source is a live space-db object. Feed messages use
          // the Mailbox-recorded association below instead (ECHO can't relate to queue items).
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

      if (owningMailbox && result) {
        // Apply tags. Requires a live message (Ref) — skipped for feed messages.
        if (live && result.tags && result.tags.length > 0) {
          for (const tag of result.tags) {
            yield* Effect.promise(() => Mailbox.applyTag(owningMailbox, tag, live, db));
          }
        }

        // Record the message → extracted-object association on the Mailbox for feed messages
        // (the relation path above only covers live space-db sources). Only top-level objects
        // (no parent — e.g. the Trip, not its child Segment/Booking) are recorded, matching the
        // dispatcher's provenance gating.
        if (!sourceIsLive) {
          const topLevelIds = [...result.created, ...(result.updated ?? [])]
            .filter((object) => Obj.getParent(object) === undefined)
            .map((object) => object.id);
          Mailbox.recordExtraction(owningMailbox, source.id, topLevelIds);
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
