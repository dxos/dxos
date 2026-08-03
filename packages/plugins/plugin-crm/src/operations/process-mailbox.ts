//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { overlayIdentityIndex } from '@dxos/extractor';
import { buildContactFromActor, getIdentityIndex, identitySpecs } from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { Mailbox } from '@dxos/plugin-inbox';
import { Message } from '@dxos/types';

import { CrmOperation } from '../types';

const handler: Operation.WithHandler<typeof CrmOperation.ProcessMailbox> = CrmOperation.ProcessMailbox.pipe(
  Operation.withHandler(
    Effect.fn(function* ({
      mailbox: mailboxRef,
      pageSize = CrmOperation.DEFAULT_PROCESS_MAILBOX_PAGE_SIZE,
      research = false,
    }) {
      const { db } = yield* Database.Service;
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const cursor = yield* findOrCreateCursor(mailbox);

      // Run-scoped overlay over the space's shared identity index — the same dedup semantics as
      // mail sync, so a repeat sender never yields a second Person regardless of which path ran.
      const index = overlayIdentityIndex(identitySpecs, yield* getIdentityIndex(db, { refresh: true }));

      // NOTE(workaround): keyed on `message.created` epoch-ms because ECHO's native feed cursor is
      // unimplemented (`Feed.cursor` is stubbed) — same as `runFactPipeline`. The cursor is a coarse
      // skip (`< cursorKey`); the identity index is the precise idempotency backstop.
      let cursorKey = Cursor.parseKey(cursor.max);
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const pending = messages
        .filter((message) => !(Date.parse(message.created) < cursorKey))
        .sort((a, b) => Date.parse(a.created) - Date.parse(b.created));

      let processed = 0;
      let contacts = 0;
      let profiles = 0;
      for (let start = 0; start < pending.length; start += pageSize) {
        const page = pending.slice(start, start + pageSize);
        for (const message of page) {
          processed += 1;
          const contact = message.sender
            ? yield* buildContactFromActor(message.sender, db, { signals: senderSignals(message), index })
            : undefined;
          if (!contact) {
            continue;
          }
          yield* Database.add(contact);
          // Feed messages are immutable queue items and cannot be relation endpoints, so extraction
          // provenance is recorded on the mailbox instead.
          Mailbox.recordExtraction(mailbox, message.id, [contact.id]);
          contacts += 1;
          if (research) {
            const { created } = yield* Operation.invoke(CrmOperation.ResearchPerson, {
              subject: Ref.make(contact),
            });
            if (created) {
              profiles += 1;
            }
          }
        }

        // Advance per page so a crashed run resumes from the last committed page.
        const keys = page.map((message) => Date.parse(message.created)).filter(Number.isFinite);
        cursorKey = Math.max(cursorKey, ...keys);
        Cursor.advance(cursor, Cursor.formatKey(cursorKey));
      }

      return { processed, contacts, profiles };
    }),
  ),
);

export default handler;

const CURSOR_KEY_SOURCE = 'org.dxos.plugin-crm';
const CURSOR_KEY_ID = 'process-mailbox';

/**
 * Finds the persisted feed Cursor tracking this operation's progress against the mailbox feed,
 * creating one on first run. Tagged with a foreign key so it never collides with other feed
 * consumers' cursors on the same feed (e.g. `AnalyzeMailbox`).
 */
const findOrCreateCursor = (mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const feedRef = mailbox.feed;
    const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
    const existing = cursors.find(
      (cursor) =>
        cursor.spec.kind === 'feed' &&
        cursor.spec.source.uri === feedRef.uri &&
        Obj.getKeys(cursor, CURSOR_KEY_SOURCE).some((key) => key.id === CURSOR_KEY_ID),
    );
    if (existing) {
      return existing;
    }
    return yield* Database.add(
      Cursor.make({
        spec: { kind: 'feed', source: feedRef, target: Ref.make(mailbox) },
        [Obj.Meta]: { keys: [{ source: CURSOR_KEY_SOURCE, id: CURSOR_KEY_ID }] },
      }),
    );
  });

/** The sender signals the shared extraction gate reads, from the fields provider mappers record. */
const senderSignals = (message: Message.Message) => {
  const properties = message.properties ?? {};
  return {
    noReply: properties.noReply === true,
    listUnsubscribe: typeof properties.listUnsubscribe === 'string' ? properties.listUnsubscribe : undefined,
    bulk: properties.bulk === true,
  };
};
