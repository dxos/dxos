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
import * as SystemTags from './SystemTags';

describe('SystemTags', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('tag atom family reflects a canonical system tag membership per message', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));

    const starredTag = await SystemTags.findOrCreateSystemTag(db, 'starred');
    const starredUri = Obj.getURI(starredTag).toString();
    await SystemTags.toggleTag(mailbox, message, db, 'starred');

    const starred = SystemTags.tagAtom(mailbox.tags!.target!, starredUri);
    const registry = Registry.make();
    expect(registry.get(starred(message.id))).toBe(true);

    await SystemTags.toggleTag(mailbox, message, db, 'starred');
    expect(registry.get(starred(message.id))).toBe(false);
  });
});
