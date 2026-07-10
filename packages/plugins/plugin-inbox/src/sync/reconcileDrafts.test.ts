//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message } from '@dxos/types';

import { GMAIL_SOURCE } from '../constants';
import { seedMailboxBinding } from '../testing/sync-fixture';
import { DraftMessage } from '../types';
import { reconcileDrafts } from './reconcileDrafts';

/** Reads the mailbox's local drafts (DB objects, not feed messages) back out. */
const queryDrafts = async (db: Database.Database, mailboxUri: string) =>
  (await db.query(Filter.type(Message.Message, { properties: { mailbox: mailboxUri } })).run()).filter((message) =>
    DraftMessage.belongsTo(message, mailboxUri),
  );

const makeSentDraft = (mailboxUri: string, sentMessageId: string) =>
  DraftMessage.make({
    created: new Date().toISOString(),
    sender: { name: 'Me' },
    blocks: [{ _tag: 'text' as const, text: 'Reply body' }],
    properties: {
      to: 'alice@example.com',
      subject: 'Re: Topic',
      mailbox: mailboxUri,
      sentMessageId,
      sentAt: new Date().toISOString(),
    },
  });

describe('reconcileDrafts', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  test('removes a sent draft once its canonical copy syncs into the feed', async ({ expect }) => {
    const { db, mailbox } = await seedMailboxBinding(builder);
    const mailboxUri = Obj.getURI(mailbox);

    db.add(makeSentDraft(mailboxUri, 'gmail-msg-1'));
    await db.flush({ indexes: true });

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const feed = yield* Database.load(mailbox.feed);
        yield* Feed.append(feed, [
          Obj.make(Message.Message, {
            [Obj.Meta]: { keys: [{ id: 'gmail-msg-1', source: GMAIL_SOURCE }] },
            created: new Date().toISOString(),
            sender: { name: 'Alice', email: 'alice@example.com' },
            blocks: [{ _tag: 'text' as const, text: 'Reply body' }],
            properties: { subject: 'Re: Topic' },
          }),
        ]);
        yield* reconcileDrafts(mailbox, feed);
      }).pipe(Effect.provide(Database.layer(db))),
    );
    await db.flush({ indexes: true });

    expect(await queryDrafts(db, mailboxUri)).toHaveLength(0);
  });

  test('leaves an unsent draft untouched', async ({ expect }) => {
    const { db, mailbox } = await seedMailboxBinding(builder);
    const mailboxUri = Obj.getURI(mailbox);

    db.add(
      DraftMessage.make({
        created: new Date().toISOString(),
        sender: { name: 'Me' },
        blocks: [{ _tag: 'text' as const, text: 'Draft body' }],
        properties: { to: 'bob@example.com', subject: 'Hello', mailbox: mailboxUri },
      }),
    );
    await db.flush({ indexes: true });

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const feed = yield* Database.load(mailbox.feed);
        yield* reconcileDrafts(mailbox, feed);
      }).pipe(Effect.provide(Database.layer(db))),
    );
    await db.flush({ indexes: true });

    expect(await queryDrafts(db, mailboxUri)).toHaveLength(1);
  });

  test('leaves a sent draft untouched when no matching feed message exists yet', async ({ expect }) => {
    const { db, mailbox } = await seedMailboxBinding(builder);
    const mailboxUri = Obj.getURI(mailbox);

    db.add(makeSentDraft(mailboxUri, 'gmail-msg-2'));
    await db.flush({ indexes: true });

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const feed = yield* Database.load(mailbox.feed);
        // A feed message with an unrelated foreign id — must not match the sent draft above.
        yield* Feed.append(feed, [
          Obj.make(Message.Message, {
            [Obj.Meta]: { keys: [{ id: 'gmail-msg-other', source: GMAIL_SOURCE }] },
            created: new Date().toISOString(),
            sender: { name: 'Bob', email: 'bob@example.com' },
            blocks: [{ _tag: 'text' as const, text: 'Unrelated' }],
            properties: { subject: 'Other' },
          }),
        ]);
        yield* reconcileDrafts(mailbox, feed);
      }).pipe(Effect.provide(Database.layer(db))),
    );
    await db.flush({ indexes: true });

    expect(await queryDrafts(db, mailboxUri)).toHaveLength(1);
  });
});
