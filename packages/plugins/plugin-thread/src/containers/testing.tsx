//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Database, type Entity, Feed, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Client, Config } from '@dxos/react-client';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Thread as LegacyThread, Message } from '@dxos/types';

import { ThreadPlugin } from '../ThreadPlugin';
import { Reaction, Thread } from '../types';

const types = [Channel.Channel, Feed.Feed, LegacyThread.Thread, Message.Message, Reaction.Reaction, Thread.Thread];

/** Identity creation and space initialization run well past testing-library's 1s default. */
export const STORY_TIMEOUT = { timeout: 15_000 };

/** What a fixture is handed: the local identity's DID, and the channel whose feed it seeds. */
export type ChannelSeed = (options: { identityDid?: string; channel: Channel.Channel }) => Entity.Unknown[];

/** Schema every channel story registers. */
export const channelStoryCapabilities = [Capability.contributes(AppCapabilities.Schema, types)];

/**
 * Plugins for a story that reads a channel's feed: a personal space holding one feed-backed channel,
 * seeded by `seed`. Parameterized because the plays and the state gallery want very different fixtures
 * from the same wiring. Each stories file spreads these into its own decorator literal — passing the
 * decorators themselves would widen their type and cost `Meta`/`StoryObj` inference in the play context.
 */
export const makeChannelStoryPlugins = (seed: ChannelSeed) => [
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
    onClientInitialized: ({ client }: { client: Client }) =>
      Effect.gen(function* () {
        const { personalSpace } = yield* initializeIdentity(client);
        const channel = personalSpace.db.add(Channel.make({ name: 'general' }));
        yield* Effect.promise(() => channel.backend.config.load());
        const feed = Channel.getFeed(channel);
        invariant(feed, 'Channel is not feed-backed');
        const items = seed({ identityDid: client.halo.identity.get()?.did, channel });
        yield* Feed.append(feed, items).pipe(Effect.provide(Database.layer(personalSpace.db)));
      }),
  }),
  SpacePlugin({}),
  ThreadPlugin(),
  CallsPlugin(),
];

/** Text of the seeded messages, so plays and the seed cannot drift apart. */
export const SEEDED = {
  /** Root authored by the local identity, with no thread — what "start a thread" acts on. */
  own: 'Hello, channel.',
  /** A second root from the same identity, so the two group under one avatar. */
  ownFollowUp: 'One more thing.',
  /** Root authored by someone else, rooting a thread and carrying the seeded reply. */
  other: 'Messages are stored in the feed.',
  /** The seeded thread's only reply. */
  reply: 'And replies live in a thread.',
};

/**
 * Fixture behind the plays: three roots — two from the local identity (which group under one avatar,
 * and are left plain so the create-a-thread path has something to act on) and one from another sender,
 * rooting a thread and carrying one reply.
 */
const seedChannel: ChannelSeed = ({ identityDid }) => {
  const own = Message.make({ sender: { identityDid }, blocks: [{ _tag: 'text', text: SEEDED.own }] });
  const ownFollowUp = Message.make({ sender: { identityDid }, blocks: [{ _tag: 'text', text: SEEDED.ownFollowUp }] });
  const other = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: SEEDED.other }] });
  // The thread exists because it was created, exactly as the UI records it — seeding replies alone
  // would exercise a path users cannot reach. Its replies carry the thread's id, not the message's.
  const thread = Thread.make({ target: Ref.make(other) });
  const reply = Message.make({
    sender: { role: 'user' },
    blocks: [{ _tag: 'text', text: SEEDED.reply }],
    threadId: thread.id,
  });
  return [own, ownFollowUp, other, thread, reply];
};

/** Harness shared by the channel article and the article of one of its threads: both read one feed. */
export const channelStoryDecorators = [
  withMosaic(),
  withTheme(),
  withLayout({ layout: 'column' }),
  withPluginManager({ capabilities: channelStoryCapabilities, plugins: makeChannelStoryPlugins(seedChannel) }),
];
