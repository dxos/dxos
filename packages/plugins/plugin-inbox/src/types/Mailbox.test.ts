//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Builder } from '../testing/builder.ts';
import * as Mailbox from './Mailbox.ts';

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

describe('identity addresses', () => {
  test('recognizes a mailbox named after the account it syncs, and nothing else', ({ expect }) => {
    expect(Mailbox.identityAddresses({ name: 'rich@example.com' })).toEqual(['rich@example.com']);
    // Normalized, so the comparison against message senders is case-insensitive.
    expect(Mailbox.identityAddresses({ name: '  Rich@Example.COM ' })).toEqual(['rich@example.com']);
    // A display name is NOT an identity: deriving against it would invert every sent/received call.
    expect(Mailbox.identityAddresses({ name: 'Inbox' })).toEqual([]);
    expect(Mailbox.identityAddresses({})).toEqual([]);
  });
});

describe('Mailbox annotations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const createMailbox = async (messageCount: number) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(messageCount).build();
    await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));

    // The annotation feed is provisioned on first use (like the tag index), not at mailbox creation.
    const annotations = db.add(Feed.make());
    Obj.setParent(annotations, mailbox);
    Obj.update(mailbox, (mailbox) => {
      mailbox.annotations = Ref.make(annotations);
    });
    await db.flush();
    return { db, mailbox, feed, annotations, messages };
  };

  const read = (db: EchoDatabase, feed: Feed.Feed) =>
    EffectEx.runAndForwardErrors(
      Feed.query(feed, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
    );

  test('merges a summary feed into the message feed by parentMessage', async ({ expect }) => {
    const { db, mailbox, feed, annotations, messages } = await createMailbox(3);
    const [first, , third] = messages;

    // Summaries for a SUBSET of the messages: the merge must not drop the unsummarized ones.
    await EffectEx.runAndForwardErrors(
      Feed.append(annotations, [
        Mailbox.makeSummary({ message: first, text: 'First summarized.', model: 'haiku' }),
        Mailbox.makeSummary({ message: third, text: 'Third summarized.' }),
      ]).pipe(Effect.provide(Database.layer(db))),
    );

    const feedMessages = await read(db, feed);
    const merged = [...Mailbox.mergeAnnotations(feedMessages, await read(db, mailbox.annotations!.target!))];

    // Every message survives, in the order given — annotations never add, remove or reorder.
    expect(merged.map((entry) => entry.message.id)).toEqual(feedMessages.map((message) => message.id));

    const entryFor = (message: Message.Message) => merged.find((entry) => entry.message.id === message.id);
    expect(entryFor(first)?.summary).toBe('First summarized.');
    expect(entryFor(third)?.summary).toBe('Third summarized.');
    // The unsummarized message is still present, simply without a summary.
    const [unsummarized] = merged.filter((entry) => entry.summary === undefined);
    expect(unsummarized.annotations).toEqual([]);
    expect(merged.filter((entry) => entry.summary !== undefined)).toHaveLength(2);
    // The annotation is a full Message, so its provenance rides along.
    expect(entryFor(first)?.annotations[0].properties?.model).toBe('haiku');
  });

  test('a re-derived summary supersedes the earlier one, which stays in the feed', async ({ expect }) => {
    const { db, mailbox, feed, annotations, messages } = await createMailbox(1);
    const [message] = messages;

    await EffectEx.runAndForwardErrors(
      Feed.append(annotations, [
        Mailbox.makeSummary({ message, text: 'Draft summary.', created: '2026-07-01T00:00:00.000Z' }),
        Mailbox.makeSummary({ message, text: 'Better summary.', created: '2026-07-02T00:00:00.000Z' }),
      ]).pipe(Effect.provide(Database.layer(db))),
    );

    const [entry] = [...Mailbox.mergeAnnotations(await read(db, feed), await read(db, mailbox.annotations!.target!))];

    // Newest wins for display; the append-only history is intact behind it.
    expect(entry.summary).toBe('Better summary.');
    expect(entry.annotations).toHaveLength(2);
    expect(entry.annotations.map(Mailbox.getSummaryText)).toEqual(['Better summary.', 'Draft summary.']);
  });

  test('the conversation summary is the newest annotation in the thread, with its provenance', async ({ expect }) => {
    // Real messages, since `parentMessage` is a ULID; only their ids matter to the selection.
    const { messages } = await createMailbox(3);
    const [first, , third] = messages;

    // Newest by the ANNOTATION's date, not the message's: a re-derivation supersedes, and the age
    // shown in the article is the age of the summary.
    const older = Mailbox.makeSummary({
      message: third,
      text: 'Older.',
      model: 'haiku',
      created: '2026-07-01T00:00:00.000Z',
    });
    const newer = Mailbox.makeSummary({ message: first, text: 'Newer.', created: '2026-07-02T00:00:00.000Z' });
    expect(Mailbox.conversationSummary(messages, [older, newer])).toEqual({
      summary: 'Newer.',
      messageId: first.id,
      created: '2026-07-02T00:00:00.000Z',
    });

    // Provenance rides along when the annotation recorded a model.
    expect(Mailbox.conversationSummary(messages, [older])).toEqual({
      summary: 'Older.',
      messageId: third.id,
      model: 'haiku',
      created: '2026-07-01T00:00:00.000Z',
    });

    // An annotation naming a message OUTSIDE this thread is not this conversation's summary.
    expect(Mailbox.conversationSummary([first], [older])).toBeUndefined();
    expect(Mailbox.conversationSummary(messages, [])).toBeUndefined();
  });

  test('annotations never leak into the message feed', async ({ expect }) => {
    const { db, mailbox, feed, annotations, messages } = await createMailbox(2);

    await EffectEx.runAndForwardErrors(
      Feed.append(annotations, [Mailbox.makeSummary({ message: messages[0], text: 'Summarized.' })]).pipe(
        Effect.provide(Database.layer(db)),
      ),
    );

    // The reason for a second feed rather than one mixed feed: no reader has to filter.
    expect(await read(db, feed)).toHaveLength(2);
    expect(await read(db, mailbox.annotations!.target!)).toHaveLength(1);
  });
});

describe('Mailbox extraction provenance', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('recordExtraction persists the first entry on a fresh mailbox and merges idempotently', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Mailbox.Mailbox, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();

    // Regression: the map is created lazily on first use, and the first recorded entry must not be
    // lost to a detached-record write.
    Mailbox.recordExtraction(mailbox, 'message-1', ['object-a']);
    expect(Mailbox.getExtractedObjectIds(mailbox, 'message-1')).toEqual(['object-a']);

    Mailbox.recordExtraction(mailbox, 'message-2', ['object-b']);
    expect(Mailbox.getExtractedObjectIds(mailbox, 'message-1')).toEqual(['object-a']);
    expect(Mailbox.getExtractedObjectIds(mailbox, 'message-2')).toEqual(['object-b']);

    // Idempotent merge: duplicate ids are not appended; new ids for the same message are.
    Mailbox.recordExtraction(mailbox, 'message-1', ['object-a', 'object-c']);
    expect(Mailbox.getExtractedObjectIds(mailbox, 'message-1')).toEqual(['object-a', 'object-c']);

    // Durability is the property the fix restores: read back through a fresh query rather than the
    // live object, so a write that never reached the document would fail here.
    await db.flush({ indexes: true });
    const [reloaded] = await db.query(Filter.type(Mailbox.Mailbox)).run();
    expect(Mailbox.getExtractedObjectIds(reloaded, 'message-1')).toEqual(['object-a', 'object-c']);
    expect(Mailbox.getExtractedObjectIds(reloaded, 'message-2')).toEqual(['object-b']);
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

describe('message filters', () => {
  const sender = (email?: string) => ({ sender: email ? { email } : undefined });

  test('matchesFilter tests the from regex (case-insensitive) against the sender email', ({ expect }) => {
    expect(Mailbox.matchesFilter({ from: 'npmjs\\.com' }, sender('bot@npmjs.com'))).toBe(true);
    expect(Mailbox.matchesFilter({ from: 'npmjs\\.com' }, sender('alice@example.com'))).toBe(false);
    expect(Mailbox.matchesFilter({ from: 'ALICE' }, sender('alice@example.com'))).toBe(true);
    expect(Mailbox.matchesFilter({ from: 'x' }, sender(undefined))).toBe(false);
    // An empty filter matches nothing.
    expect(Mailbox.matchesFilter({}, sender('a@b.com'))).toBe(false);
  });

  test('an invalid regex falls back to a substring match', ({ expect }) => {
    expect(Mailbox.matchesFilter({ from: 'a(b' }, sender('xa(bx@y.com'))).toBe(true);
  });

  test('isFiltered matches any of the mailbox filters', ({ expect }) => {
    const mailbox = { messageFilters: [{ from: 'npmjs' }, { from: 'github' }] };
    expect(Mailbox.isFiltered(mailbox, sender('bot@npmjs.com'))).toBe(true);
    expect(Mailbox.isFiltered(mailbox, sender('a@github.com'))).toBe(true);
    expect(Mailbox.isFiltered(mailbox, sender('a@x.com'))).toBe(false);
    expect(Mailbox.isFiltered({}, sender('a@x.com'))).toBe(false);
  });
});

describe('subscriptions', () => {
  const msg = (email: string, name: string | undefined, listUnsubscribe?: string) =>
    Message.make({
      created: '2026-01-01T00:00:00.000Z',
      sender: { email, name },
      blocks: [{ _tag: 'text', text: 'body' }],
      properties: { subject: 's', ...(listUnsubscribe ? { listUnsubscribe } : {}) },
    });

  test('parseUnsubscribe extracts http (one-click) and mailto targets', ({ expect }) => {
    expect(Mailbox.parseUnsubscribe('<https://x.io/u?t=1>, <mailto:unsub@x.io>')).toEqual({
      http: 'https://x.io/u?t=1',
      mailto: 'mailto:unsub@x.io',
    });
    expect(Mailbox.parseUnsubscribe('<mailto:unsub@x.io>')).toEqual({ mailto: 'mailto:unsub@x.io' });
    expect(Mailbox.parseUnsubscribe('not a header')).toEqual({});
  });

  test('parseUnsubscribe accepts a bare URL (body-extracted affordance)', ({ expect }) => {
    expect(Mailbox.parseUnsubscribe('https://x.io/unsubscribe?t=1')).toEqual({ http: 'https://x.io/unsubscribe?t=1' });
    expect(Mailbox.parseUnsubscribe('mailto:unsub@x.io')).toEqual({ mailto: 'mailto:unsub@x.io' });
  });

  test('extractBodyUnsubscribe finds unsubscribe-shaped links in text blocks', ({ expect }) => {
    const withBody = (text: string) =>
      Message.make({
        created: '2026-01-01T00:00:00.000Z',
        sender: { email: 'news@a.io' },
        blocks: [{ _tag: 'text', text }],
        properties: { subject: 's' },
      });
    expect(Mailbox.extractBodyUnsubscribe(withBody('Bye. https://a.io/unsubscribe?u=1 Thanks'))).toBe(
      'https://a.io/unsubscribe?u=1',
    );
    expect(Mailbox.extractBodyUnsubscribe(withBody('Manage: https://a.io/email-preferences/x'))).toBe(
      'https://a.io/email-preferences/x',
    );
    expect(Mailbox.extractBodyUnsubscribe(withBody('no links here'))).toBeUndefined();
  });

  test('getUnsubscribeAffordance prefers the header over a body link', ({ expect }) => {
    const message = Message.make({
      created: '2026-01-01T00:00:00.000Z',
      sender: { email: 'news@a.io' },
      blocks: [{ _tag: 'text', text: 'https://a.io/unsubscribe?body=1' }],
      properties: { subject: 's', listUnsubscribe: '<https://a.io/u?header=1>' },
    });
    expect(Mailbox.getUnsubscribeAffordance(message)).toBe('<https://a.io/u?header=1>');
  });

  test('parseUnsubscribe accepts a bare URL (body-extracted affordance)', ({ expect }) => {
    expect(Mailbox.parseUnsubscribe('https://x.io/unsubscribe?t=1')).toEqual({ http: 'https://x.io/unsubscribe?t=1' });
    expect(Mailbox.parseUnsubscribe('mailto:unsub@x.io')).toEqual({ mailto: 'mailto:unsub@x.io' });
  });

  test('extractBodyUnsubscribe finds unsubscribe-shaped links in text blocks', ({ expect }) => {
    const withBody = (text: string) =>
      Message.make({
        created: '2026-01-01T00:00:00.000Z',
        sender: { email: 'news@a.io' },
        blocks: [{ _tag: 'text', text }],
        properties: { subject: 's' },
      });
    expect(Mailbox.extractBodyUnsubscribe(withBody('Bye. https://a.io/unsubscribe?u=1 Thanks'))).toBe(
      'https://a.io/unsubscribe?u=1',
    );
    expect(Mailbox.extractBodyUnsubscribe(withBody('Manage: https://a.io/email-preferences/x'))).toBe(
      'https://a.io/email-preferences/x',
    );
    expect(Mailbox.extractBodyUnsubscribe(withBody('no links here'))).toBeUndefined();
  });

  test('getUnsubscribeAffordance prefers the header over a body link', ({ expect }) => {
    const message = Message.make({
      created: '2026-01-01T00:00:00.000Z',
      sender: { email: 'news@a.io' },
      blocks: [{ _tag: 'text', text: 'https://a.io/unsubscribe?body=1' }],
      properties: { subject: 's', listUnsubscribe: '<https://a.io/u?header=1>' },
    });
    expect(Mailbox.getUnsubscribeAffordance(message)).toBe('<https://a.io/u?header=1>');
  });

  test('deriveSubscriptions groups senders with an unsubscribe affordance, noisiest first', ({ expect }) => {
    const subs = Mailbox.deriveSubscriptions([
      msg('news@a.io', 'A News', '<https://a.io/u>'),
      msg('news@a.io', 'A News', '<https://a.io/u>'),
      msg('digest@b.io', 'B Digest', '<mailto:unsub@b.io>'),
      msg('alice@x.com', 'Alice'), // no unsubscribe → not a subscription
    ]);
    expect(subs.map((sub) => sub.email)).toEqual(['news@a.io', 'digest@b.io']);
    expect(subs[0]).toMatchObject({ email: 'news@a.io', name: 'A News', count: 2 });
    expect(subs.some((sub) => sub.email === 'alice@x.com')).toBe(false);
  });

  test('deriveSubscriptions breaks count ties alphabetically', ({ expect }) => {
    const subs = Mailbox.deriveSubscriptions([
      msg('zeta@z.io', 'Zeta', '<https://z.io/u>'),
      msg('alpha@a.io', 'alpha', '<https://a.io/u>'),
      msg('mid@m.io', undefined, '<https://m.io/u>'),
    ]);
    expect(subs.map((sub) => sub.email)).toEqual(['alpha@a.io', 'mid@m.io', 'zeta@z.io']);
  });
});
