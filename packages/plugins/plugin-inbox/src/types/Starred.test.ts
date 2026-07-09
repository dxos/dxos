//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Builder } from '../testing/builder';
import * as Mailbox from './Mailbox';
import * as Starred from './Starred';

describe('Starred', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('atom family reflects starred membership per message', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));

    const starredTag = await Tag.findOrCreate(db, Starred.TAG_STARRED);
    const starredUri = Obj.getURI(starredTag).toString();
    await Starred.toggleStarred(mailbox, message, db);

    const starred = Starred.atom(mailbox.tags!.target!, starredUri);
    const registry = Registry.make();
    expect(registry.get(starred(message.id))).toBe(true);

    await Starred.toggleStarred(mailbox, message, db);
    expect(registry.get(starred(message.id))).toBe(false);
  });
});
