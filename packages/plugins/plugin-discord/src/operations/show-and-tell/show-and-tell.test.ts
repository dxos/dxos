//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as Mode from '@dxos/plugin-agent/Mode';
import { Channel } from '@dxos/types';

import { DiscordChannel, ShowAndTell } from '#types';

import { startOfWeek } from './curate.ts';
import enable from './enable.ts';
import fileLinks from './file-links.ts';
import listLinks from './list-links.ts';

const TestLayer = TestDatabaseLayer({
  types: [
    ShowAndTell.Entry,
    Agent.Agent,
    Instructions.Instructions,
    Mode.Mode,
    Channel.Channel,
    DiscordChannel.DiscordChannel,
  ],
});

/** A moment inside the current week, so `this-week` finds it whatever day the test runs. */
const thisWeek = (hours: number) => new Date(startOfWeek(new Date()).getTime() + hours * 60 * 60 * 1000).toISOString();

describe('FileLinks', () => {
  it.effect('files one row per link, keeps the model’s fields, and files a redelivered message once', () =>
    Effect.gen(function* () {
      const input = {
        author: 'rich',
        text: 'Kanban demo https://composer.space/demo/1 and the PR https://github.com/dxos/dxos/pull/2',
        links: [{ url: 'https://composer.space/demo/1', title: 'Kanban', summary: 'Drag cards between columns.' }],
        postedAt: thisWeek(1),
        messageId: 'm-1',
        channelId: 'c-1',
      };
      const first = yield* fileLinks.handler(input);
      expect(first).toEqual({
        filed: [
          {
            link: 'https://composer.space/demo/1',
            title: 'Kanban',
            category: 'demo',
            summary: 'Drag cards between columns.',
          },
          {
            link: 'https://github.com/dxos/dxos/pull/2',
            title: 'github.com/dxos/dxos/pull/2',
            category: 'code',
            summary: '',
          },
        ],
        skipped: 0,
      });

      const again = yield* fileLinks.handler(input);
      expect(again).toEqual({ filed: [], skipped: 2 });
      const rows = yield* Database.query(Filter.type(ShowAndTell.Entry)).run;
      expect(rows.map(({ author, messageId, channelId }) => ({ author, messageId, channelId }))).toEqual([
        { author: 'rich', messageId: 'm-1', channelId: 'c-1' },
        { author: 'rich', messageId: 'm-1', channelId: 'c-1' },
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('ListLinks', () => {
  it.effect('lists this week’s rows oldest first, by person or category, with a digest', () =>
    Effect.gen(function* () {
      yield* fileLinks.handler({ author: 'dima', text: 'https://www.loom.com/share/a', postedAt: thisWeek(2) });
      yield* fileLinks.handler({ author: 'rich', text: 'https://composer.space/demo/1', postedAt: thisWeek(1) });
      yield* fileLinks.handler({ author: 'rich', text: 'https://example.com/old', postedAt: '2020-01-01T00:00:00Z' });

      const week = yield* listLinks.handler({});
      expect(week.entries.map(({ author, category }) => `${author}:${category}`)).toEqual(['rich:demo', 'dima:video']);
      expect(week.digest).toContain('**dima** (1)');

      expect((yield* listLinks.handler({ author: '@Dima' })).entries).toHaveLength(1);
      expect((yield* listLinks.handler({ category: 'demo' })).entries).toHaveLength(1);
      expect((yield* listLinks.handler({ period: 'all' })).entries).toHaveLength(3);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('EnableShowAndTell', () => {
  it.effect('binds and curates the channel and gives the agent the show-and-tell mode, once', () =>
    Effect.gen(function* () {
      const agent = yield* Database.add(
        Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ name: 'Kai', text: '' })) }),
      );
      const channel = yield* Database.add(
        Channel.make({
          backend: {
            kind: DiscordChannel.BACKEND_KIND,
            config: DiscordChannel.make({ applicationId: 'app-1', channels: ['general'] }),
          },
        }),
      );
      const input = { agent: Ref.make(agent), channel: Ref.make(channel), discordChannelId: 'demos' };

      // An agent with no chat yet has nothing to switch; its mode is still there for when it has one.
      expect(yield* enable.handler(input)).toEqual({
        mode: ShowAndTell.MODE_NAME,
        channels: ['general', 'demos'],
        curate: ['demos'],
        switched: false,
      });
      yield* enable.handler(input);

      const config = yield* Database.load(channel.backend.config);
      expect(DiscordChannel.instanceOf(config) && config.curate).toEqual(['demos']);
      const modes = yield* Database.query(Filter.and(Filter.type(Mode.Mode), Filter.childOf(agent))).run;
      expect(modes.map(({ name }) => name)).toEqual([ShowAndTell.MODE_NAME]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
