//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Tag, TagIndex } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
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
    const { db, queues } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(createFeedServiceLayer(queues))));

    // Applying a tag creates a Tag object and indexes the message under its uri.
    const tagUri = await Mailbox.applyTag(mailbox, { label: 'Urgent' }, message, db);
    const tagObjects = await db.query(Filter.type(Tag.Tag)).run();
    expect(tagObjects.map((tag) => tag.label)).toContain('Urgent');
    expect(Mailbox.getTagsForMessage(mailbox, message)).toEqual([tagUri]);
    expect([...TagIndex.bind(mailbox, 'tags').objects(tagUri)]).toEqual([message.id]);

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
