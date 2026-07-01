//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Message } from '@dxos/types';

import { makeDiscordLayerFromToken } from '../services';
import { fetchChannelMessages } from '../testing';

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;
const hasCredentials = Boolean(token && channelId);

describe('Discord channel sync', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test.skipIf(!hasCredentials)(
    'fetches messages and appends them to an in-memory feed',
    async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, Message.Message] });
      const db = await peer.createDatabase();

      const { messages, cursor, fetchedAt, threads } = await EffectEx.runPromise(
        fetchChannelMessages(channelId!, { maxDays: 30 }).pipe(Effect.provide(makeDiscordLayerFromToken(token!))),
      );

      expect(messages.length).toBeGreaterThan(0);
      expect(cursor).toBeDefined();
      expect(fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(Array.isArray(threads)).toBe(true);
      for (const thread of threads) {
        expect(thread.channelId).toBeDefined();
        expect(thread.parentMessageId).toBeDefined();
        expect(Array.isArray(thread.messages)).toBe(true);
      }

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'discord-test' }));
        yield* Feed.append(
          feed,
          messages.map((message) => Obj.make(Message.Message, message)),
        );

        const stored = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        expect(stored.length).toBe(messages.length);

        const first = stored[0];
        expect(first.sender?.name).toBeDefined();
        expect(Array.isArray(first.blocks)).toBe(true);
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    },
    30_000,
  );
});
