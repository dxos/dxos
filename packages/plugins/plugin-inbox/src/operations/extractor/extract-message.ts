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

      const outcome = yield* dispatch(
        { db, source, extractorId },
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

      // Apply tags to the source message. The Mailbox containing this message owns the tag map;
      // resolve the owning mailbox by querying each mailbox's feed for the message id, falling
      // back to the first mailbox in the space (e.g. unit tests where the message isn't yet in a
      // feed).
      if (result?.tags && result.tags.length > 0) {
        const message = source as Message.Message;
        const mailboxes = yield* Effect.promise(() => db.query(Filter.type(Mailbox.Mailbox)).run());
        const owningMailbox = yield* Effect.promise(async () => {
          for (const candidate of mailboxes) {
            const feed = await candidate.feed?.tryLoad();
            if (!feed) {
              continue;
            }
            const found = await db.query(Query.select(Filter.id(message.id)).from(feed)).run();
            if (found.length > 0) {
              return candidate;
            }
          }
          return mailboxes[0];
        });
        if (owningMailbox) {
          for (const tag of result.tags) {
            Mailbox.applyTag(owningMailbox, tag, message);
          }
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
