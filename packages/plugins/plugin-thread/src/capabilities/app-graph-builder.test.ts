//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Channel, Message, ThreadRoot } from '@dxos/types';

import { getThreadNodeId } from '../types';
import { createChannelThreadsExtension } from './app-graph-builder';

const CHANNEL_ID = 'channel';

const types = [Channel.Channel, Feed.Feed, Message.Message, ThreadRoot.ThreadRoot];

/** The channel as a second client reads it: a live object whose refs start out unresolved. */
const readChannel = async (peer: EchoTestPeer, spaceKey: PublicKey): Promise<Channel.Channel> => {
  const client = await peer.createClient();
  const db = await peer.openDatabase(spaceKey, undefined, { client });
  const [channel] = await db.query(Filter.type(Channel.Channel)).run();
  invariant(Obj.instanceOf(Channel.Channel, channel), 'Channel not found');
  return channel;
};

/**
 * The channel's `child` relation has emptied twice without a failing test — once on a node id holding
 * the path separator, once on the connector itself — and both times every thread vanished from the
 * navtree, because a connector that throws takes the whole relation with it. So expand it for real.
 */
describe('channel threads graph extension', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /**
   * @param unresolvedFeedRef Graph the channel as a second client reads it from disk, with its
   *   backend-config ref not yet resolved — the state the navtree expands a channel in.
   */
  const setupTestContext = async ({ unresolvedFeedRef = false }: { unresolvedFeedRef?: boolean } = {}) => {
    const { peer, key, db } = await builder.createDatabase({ types });
    const channel = db.add(Channel.make({ name: 'general' }));
    await channel.backend.config.load();
    await db.flush();
    const feed = Channel.getFeed(channel);
    invariant(feed, 'Channel is not feed-backed');

    const subject = unresolvedFeedRef ? await readChannel(peer, key) : channel;
    const rootExtensions = await EffectEx.runPromise(
      GraphBuilder.createExtension({
        id: 'testRoot',
        match: NodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: CHANNEL_ID, type: 'test', data: subject }]),
      }),
    );
    const context = setupGraphBuilder({ extensions: rootExtensions });
    // No client capability is contributed: an absent identity must still list threads (it only gates
    // the rename action), which is also the state the connector runs in before HALO resolves.
    const capabilities = CapabilityManager.make({ registry: context.registry });
    const threadExtensions = await EffectEx.runPromise(
      createChannelThreadsExtension().pipe(Effect.provideService(Capability.Service, capabilities)),
    );
    context.addExtensions(threadExtensions);

    await context.expand(Node.RootId);
    await context.expand(qualifyId(Node.RootId, CHANNEL_ID));

    return {
      ...context,
      db,
      channel,
      append: async (items: Parameters<typeof Feed.append>[1]) => {
        await EffectEx.runPromise(Feed.append(feed, items).pipe(Effect.provide(Database.layer(db))));
        await db.flush();
        await context.flush();
      },
      getThreadNodes: () =>
        context.getConnections(qualifyId(Node.RootId, CHANNEL_ID)).filter((node) => node.type.endsWith('/thread')),
    };
  };

  test('a channel with no threads has no thread children', async ({ expect }) => {
    const { getThreadNodes } = await setupTestContext();
    expect(getThreadNodes()).toEqual([]);
  });

  test('a declared thread becomes a child of its channel', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext();

    const root = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Release the plan' }] });
    await append([root]);
    // Undeclared and unreplied, the message is only a *potential* thread.
    expect(getThreadNodes()).toEqual([]);

    await append([ThreadRoot.make({ target: Ref.make(root), creator: { role: 'user' } })]);
    // Unnamed, so the node falls back to the text of the message it branches from.
    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release the plan']);
    expect(getThreadNodes()[0]?.id).toEqual(qualifyId(Node.RootId, CHANNEL_ID, getThreadNodeId(root.id)));
  });

  test('a declared name labels the thread', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext();

    const root = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Release the plan' }] });
    await append([root, ThreadRoot.make({ target: Ref.make(root), creator: { role: 'user' }, name: 'Release plan' })]);

    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release plan']);
  });

  test('a thread holding replies is listed without a declaration', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext();

    // Seeded and imported threads (the onboarding exemplar) carry no declaration; their replies alone
    // have to keep them addressable.
    const root = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Root' }] });
    const reply = Message.make({
      sender: { role: 'user' },
      blocks: [{ _tag: 'text', text: 'Reply' }],
      threadId: root.id,
    });
    await append([root, reply]);

    await expect.poll(() => getThreadNodes().length).toEqual(1);
  });

  test('a thread is listed even though the feed ref resolves after the channel expands', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext({ unresolvedFeedRef: true });

    const root = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Release the plan' }] });
    await append([root, ThreadRoot.make({ target: Ref.make(root), creator: { role: 'user' }, name: 'Release plan' })]);

    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release plan']);
  });
});
