//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Channel, Message } from '@dxos/types';

import { ThreadAnnotation, getThreadNodeId } from '../types';
import { createChannelThreadsExtension } from './app-graph-builder';

const CHANNEL_ID = 'channel';

const types = [Channel.Channel, Feed.Feed, Message.Message];

/** A message the create-thread operation has marked, which is what makes its thread exist. */
const threadRoot = (text: string, name?: string): Message.Message => {
  const message = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text }] });
  ThreadAnnotation.create(message);
  if (name) {
    ThreadAnnotation.setName(message, name);
  }
  return message;
};

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
    context.addExtensions(await EffectEx.runPromise(createChannelThreadsExtension()));

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
      /** The channel's messages as the app holds them: live objects read back out of the feed. */
      messages: () => db.query(Query.select(Filter.type(Message.Message)).from(feed)).run(),
      getThreadNodes: () =>
        context.getConnections(qualifyId(Node.RootId, CHANNEL_ID)).filter((node) => node.type.endsWith('/thread')),
    };
  };

  test('a channel with no threads has no thread children', async ({ expect }) => {
    const { getThreadNodes } = await setupTestContext();
    expect(getThreadNodes()).toEqual([]);
  });

  test('a created thread becomes a child of its channel, carrying the channel and its id', async ({ expect }) => {
    const { channel, append, getThreadNodes } = await setupTestContext();

    const plain = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Just a message' }] });
    await append([plain]);
    // With no thread created from it and no replies, the message is only a *potential* thread.
    expect(getThreadNodes()).toEqual([]);

    const root = threadRoot('Release the plan');
    await append([root]);
    // Unnamed, so the node falls back to the text of the message it branches from.
    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release the plan']);

    const [node] = getThreadNodes();
    expect(node?.id).toEqual(qualifyId(Node.RootId, CHANNEL_ID, getThreadNodeId(root.id)));
    // The node's data is the channel; the thread is metadata beside it, as a mailbox filter node is.
    expect(node?.data).toEqual(channel);
    expect(node?.properties.threadId).toEqual(root.id);
  });

  test('a named thread takes its name from the root message', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext();

    await append([threadRoot('Release the plan', 'Release plan')]);

    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release plan']);
  });

  test('a thread holding replies is listed even though none was created', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext();

    // Seeded and imported threads (the onboarding exemplar) carry no mark; their replies alone have
    // to keep them addressable.
    const root = Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Root' }] });
    const reply = Message.make({
      sender: { role: 'user' },
      blocks: [{ _tag: 'text', text: 'Reply' }],
      threadId: root.id,
    });
    await append([root, reply]);

    await expect.poll(() => getThreadNodes().length).toEqual(1);
  });

  // Creating a thread marks a message the connector has already listed, which moves nothing in the
  // feed — so a connector reading only the query would never notice, and the navtree would stay empty
  // until the next message arrived.
  test('a thread created on a message already in the channel is listed', async ({ expect }) => {
    const { append, messages, getThreadNodes } = await setupTestContext();

    await append([Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'Release the plan' }] })]);
    expect(getThreadNodes()).toEqual([]);

    const [live] = await messages();
    ThreadAnnotation.create(live);

    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release the plan']);
  });

  // A thread node carries its channel as data, so a connector matching on that type alone would hang
  // the channel's threads under each of its threads, and under those, without end.
  test('a thread has no threads of its own', async ({ expect }) => {
    const { append, expand, getConnections, getThreadNodes } = await setupTestContext();

    await append([threadRoot('Release the plan')]);
    await expect.poll(() => getThreadNodes().length).toEqual(1);

    const [thread] = getThreadNodes();
    await expand(thread.id);
    expect(getConnections(thread.id)).toEqual([]);
  });

  test('a thread is listed even though the feed ref resolves after the channel expands', async ({ expect }) => {
    const { append, getThreadNodes } = await setupTestContext({ unresolvedFeedRef: true });

    await append([threadRoot('Release the plan', 'Release plan')]);

    await expect.poll(() => getThreadNodes().map((node) => node.properties.label)).toEqual(['Release plan']);
  });
});
