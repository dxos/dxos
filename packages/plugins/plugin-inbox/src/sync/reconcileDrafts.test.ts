//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';
import { Message } from '@dxos/types';

import { GMAIL_SOURCE } from '../constants';
import { seedMailboxBinding } from '../testing/sync-fixture';
import { DraftMessage, type Mailbox } from '../types';
import { EmailStage } from './index';

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

/** A synced message flowing in from a provider, carrying its provider foreign id. */
const makeSyncedMapped = (foreignId: string, key: number): EmailStage.Mapped => ({
  message: Obj.make(Message.Message, {
    [Obj.Meta]: { keys: [{ id: foreignId, source: GMAIL_SOURCE }] },
    created: new Date(key).toISOString(),
    sender: { name: 'Alice', email: 'alice@example.com' },
    blocks: [{ _tag: 'text' as const, text: 'Reply body' }],
    properties: { subject: 'Re: Topic' },
  }),
  foreignId,
  key,
  tagUris: [],
});

/**
 * Drives the reconcile-in-commit chain: pool sent drafts, flow the given synced messages through
 * `reconcileDrafts` → `toCommitUnit` → the commit sink (which appends the canonical message and runs
 * the deferred draft removal), exactly as the provider sync ops do.
 */
const runReconcile = (
  db: Database.Database,
  mailbox: Mailbox.Mailbox,
  binding: SyncBinding.SyncBinding,
  synced: readonly EmailStage.Mapped[],
) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const feed = yield* Database.load(mailbox.feed);
      const tagIndex = yield* Database.load(mailbox.tags);
      const draftPool = yield* EmailStage.queryDraftPool(mailbox);
      const stats: SyncBinding.Stats = { newMessages: 0 };
      yield* Stream.fromIterable(synced).pipe(
        EmailStage.reconcileDrafts(draftPool),
        EmailStage.toCommitUnit(),
        Stream.grouped(2),
        Pipeline.run({ sink: SyncBinding.commit }),
        Effect.provide(
          SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: GMAIL_SOURCE, cursorKey: 0, stats }),
        ),
      );
    }).pipe(Effect.provide(Database.layer(db))),
  );

describe('reconcileDrafts', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  test('queryDraftPool pools sent drafts by sentMessageId and excludes unsent drafts', async ({ expect }) => {
    const { db, mailbox } = await seedMailboxBinding(builder);
    const mailboxUri = Obj.getURI(mailbox);

    db.add(makeSentDraft(mailboxUri, 'gmail-msg-1'));
    db.add(
      DraftMessage.make({
        created: new Date().toISOString(),
        sender: { name: 'Me' },
        blocks: [{ _tag: 'text' as const, text: 'Unsent' }],
        properties: { to: 'bob@example.com', subject: 'Hello', mailbox: mailboxUri },
      }),
    );
    await db.flush({ indexes: true });

    const pool = await EffectEx.runPromise(
      EmailStage.queryDraftPool(mailbox).pipe(Effect.provide(Database.layer(db))),
    );

    expect([...pool.keys()]).toEqual(['gmail-msg-1']);
    expect(pool.get('gmail-msg-1')).toHaveLength(1);
  });

  test('removes a sent draft once its canonical copy syncs into the feed', async ({ expect }) => {
    const { db, mailbox, binding } = await seedMailboxBinding(builder);
    const mailboxUri = Obj.getURI(mailbox);

    db.add(makeSentDraft(mailboxUri, 'gmail-msg-1'));
    await db.flush({ indexes: true });

    await runReconcile(db, mailbox, binding, [makeSyncedMapped('gmail-msg-1', 10)]);
    await db.flush({ indexes: true });

    expect(await queryDrafts(db, mailboxUri)).toHaveLength(0);
  });

  test('leaves an unsent draft untouched', async ({ expect }) => {
    const { db, mailbox, binding } = await seedMailboxBinding(builder);
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

    await runReconcile(db, mailbox, binding, [makeSyncedMapped('gmail-msg-1', 10)]);
    await db.flush({ indexes: true });

    expect(await queryDrafts(db, mailboxUri)).toHaveLength(1);
  });

  test('leaves a sent draft untouched when no matching feed message arrives', async ({ expect }) => {
    const { db, mailbox, binding } = await seedMailboxBinding(builder);
    const mailboxUri = Obj.getURI(mailbox);

    db.add(makeSentDraft(mailboxUri, 'gmail-msg-2'));
    await db.flush({ indexes: true });

    // A synced message with an unrelated foreign id — must not match the sent draft above.
    await runReconcile(db, mailbox, binding, [makeSyncedMapped('gmail-msg-other', 10)]);
    await db.flush({ indexes: true });

    expect(await queryDrafts(db, mailboxUri)).toHaveLength(1);
  });
});
