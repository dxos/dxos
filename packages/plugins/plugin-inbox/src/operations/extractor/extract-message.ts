//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Filter, Query, Relation } from '@dxos/echo';
import { dispatch, fromExtractors } from '@dxos/extractor';
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

      // Resolve the owning Mailbox AND the live source object. The `source` arg may be a
      // deserialized snapshot (this operation runs in a separate process), but both
      // `ExtractedFrom` relation endpoints and tag `Ref`s require live ECHO proxies — a snapshot
      // as a relation Target throws "target must be an ECHO object". The owning mailbox's feed
      // holds the live object, so resolve it by querying each mailbox's feed for the source id.
      // Falls back to the passed `source` (unit tests add it to the db directly, so it's already
      // a proxy) and the first mailbox in the space.
      const mailboxes = yield* Effect.promise(() => db.query(Filter.type(Mailbox.Mailbox)).run());
      const resolved = yield* Effect.promise(async () => {
        for (const candidate of mailboxes) {
          const feed = await candidate.feed?.tryLoad();
          if (!feed) {
            continue;
          }
          const found = await db.query(Query.select(Filter.id(source.id)).from(feed)).run();
          if (found.length > 0) {
            return { mailbox: candidate, message: found[0] };
          }
        }
        return { mailbox: mailboxes[0], message: undefined };
      });
      const owningMailbox = resolved.mailbox;
      const liveSource = resolved.message ?? source;

      const outcome = yield* dispatch(
        { db, source: liveSource, extractorId },
        {
          provenance: ({ source: from, object, extractorId: id, extractedAt, confidence }) =>
            ExtractedFrom.make({
              [Relation.Source]: object,
              [Relation.Target]: from,
              extractorId: id,
              extractedAt,
              confidence,
            }),
        },
      ).pipe(
        Effect.provide(fromExtractors(extractors)),
        Effect.provide(InboxResolver.Live),
        Effect.provide(Database.layer(db)),
      );

      const result = outcome.result;

      // Apply tags to the (live) source message via its owning Mailbox.
      if (result?.tags && result.tags.length > 0 && owningMailbox) {
        for (const tag of result.tags) {
          Mailbox.applyTag(owningMailbox, tag, liveSource as Message.Message);
        }
      }

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
