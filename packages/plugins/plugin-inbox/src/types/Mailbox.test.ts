//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Builder } from '../testing/builder';
import * as Mailbox from './Mailbox';

describe('Mailbox tags', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('applyTag creates a Tag object and indexes the immutable message', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));

    // Applying a tag creates a Tag object and indexes the message under its uri.
    const tagUri = await Mailbox.applyTag(mailbox, { label: 'Urgent' }, message, db);
    const tagObjects = await db.query(Filter.type(Tag.Tag)).run();
    expect(tagObjects.map((tag) => tag.label)).toContain('Urgent');
    expect(Mailbox.getTagsForMessage(mailbox, message)).toEqual([tagUri]);
    expect([...TagIndex.bind(mailbox.tags!.target!).objects(tagUri)]).toEqual([message.id]);

    // Idempotent: applying the same label (case-insensitive) reuses the Tag object.
    const tagUriAgain = await Mailbox.applyTag(mailbox, { label: 'urgent' }, message, db);
    expect(tagUriAgain).toEqual(tagUri);
    const urgentTags = (await db.query(Filter.type(Tag.Tag)).run()).filter(
      (tag) => tag.label.toLowerCase() === 'urgent',
    );
    expect(urgentTags).toHaveLength(1);

    // Removing unsets the association.
    Mailbox.removeTag(mailbox, tagUri, message);
    expect(Mailbox.getTagsForMessage(mailbox, message)).toEqual([]);
  });
});

describe('replyability (person-only)', () => {
  const msg = (sender: { email?: string; name?: string }, properties: Record<string, unknown> = {}) =>
    Message.make({
      created: '2026-01-01T00:00:00.000Z',
      sender,
      blocks: [{ _tag: 'text', text: 'hi' }],
      properties,
    });

  test('a person is replyable', ({ expect }) => {
    expect(Mailbox.isReplyable(msg({ email: 'alice@unknown.com', name: 'Alice' }))).toBe(true);
    expect(Mailbox.isReplyable(msg({ email: 'jane.doe@acme.com' }))).toBe(true);
  });

  test('no-reply / unsubscribe / mailer-daemon are not replyable', ({ expect }) => {
    expect(Mailbox.isReplyable(msg({ email: 'no-reply@acme.com' }))).toBe(false);
    expect(Mailbox.isReplyable(msg({ email: 'a@acme.com' }, { noReply: true }))).toBe(false);
    expect(Mailbox.isReplyable(msg({ email: 'a@acme.com' }, { listUnsubscribe: '<https://x/unsub>' }))).toBe(false);
  });

  test('organizational / role senders are not replyable', ({ expect }) => {
    for (const email of ['support@acme.com', 'billing@acme.com', 'notifications@github.com', 'careers@bigco.com']) {
      expect(Mailbox.isReplyable(msg({ email })), email).toBe(false);
    }
    expect(Mailbox.isReplyable(msg({ email: 'hello@acme.com', name: 'Acme Inc' }))).toBe(false);
    expect(Mailbox.isOrgSender(msg({ email: 'support@acme.com' }))).toBe(true);
    expect(Mailbox.isOrgSender(msg({ email: 'alice@unknown.com', name: 'Alice' }))).toBe(false);
  });

  test('an explicit senderClass overrides the heuristic (but not the no-reply gate)', ({ expect }) => {
    // A role address the LLM decided is actually a person still gets a reply.
    expect(Mailbox.isReplyable(msg({ email: 'support@acme.com' }), { senderClass: 'person' })).toBe(true);
    // A plain address the LLM classified as org does not.
    expect(Mailbox.isReplyable(msg({ email: 'alice@unknown.com' }), { senderClass: 'org' })).toBe(false);
    // A hard no-reply signal wins regardless of the classified type.
    expect(Mailbox.isReplyable(msg({ email: 'no-reply@acme.com' }), { senderClass: 'person' })).toBe(false);
  });
});
