//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Database, Feed, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Reaction, Thread, ThreadRoot } from '@dxos/types';

import { ThreadPlugin } from '../ThreadPlugin';

const types = [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message, Reaction.Reaction, ThreadRoot.ThreadRoot];

/** Identity creation and space initialization run well past testing-library's 1s default. */
export const STORY_TIMEOUT = { timeout: 15_000 };

/** Text of the seeded messages, so plays and the seed cannot drift apart. */
export const SEEDED = {
  /** Root authored by the local identity, with no thread — what "start a thread" acts on. */
  own: 'Hello, channel.',
  /** Root authored by someone else, declared a thread root and carrying the seeded reply. */
  other: 'Messages are stored in the feed.',
  /** The seeded thread's only reply. */
  reply: 'And replies live in a thread.',
};

/**
 * Storybook harness shared by the channel article and the article of one of its threads: a personal
 * space holding one feed-backed channel seeded with two roots — the second declared a thread root and
 * carrying one reply, the first left plain so the create-a-thread path has something to act on. Both
 * views read that same feed, so they must be exercised against the same fixture.
 */
export const channelStoryDecorators = [
  withMosaic(),
  withTheme(),
  withLayout({ layout: 'column' }),
  withPluginManager({
    capabilities: [Capability.contributes(AppCapabilities.Schema, types)],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types,
        config: new Config({
          runtime: {
            services: {
              edge: { url: 'https://edge.dxos.workers.dev/' },
              iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
            },
          },
        }),
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            const channel = personalSpace.db.add(Channel.make({ name: 'general' }));
            yield* Effect.promise(() => channel.backend.config.load());
            const feed = Channel.getFeed(channel);
            invariant(feed, 'Channel is not feed-backed');
            const own = Message.make({
              sender: { identityDid: client.halo.identity.get()?.did },
              blocks: [{ _tag: 'text', text: SEEDED.own }],
            });
            const other = Message.make({
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: SEEDED.other }],
            });
            const reply = Message.make({
              sender: { role: 'user' },
              blocks: [{ _tag: 'text', text: SEEDED.reply }],
              threadId: other.id,
            });
            // The reply's thread exists because it was declared, exactly as creating one in the UI
            // records it — seeding replies alone would exercise a path users cannot reach.
            const declaration = ThreadRoot.make({
              target: Ref.make(other),
              creator: { identityDid: client.halo.identity.get()?.did },
            });
            yield* Feed.append(feed, [own, other, reply, declaration]).pipe(
              Effect.provide(Database.layer(personalSpace.db)),
            );
          }),
      }),
      SpacePlugin({}),
      ThreadPlugin(),
      CallsPlugin(),
    ],
  }),
];
