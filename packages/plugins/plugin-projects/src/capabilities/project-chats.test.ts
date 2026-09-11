//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Feed, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import {
  CHATS_SEGMENT,
  createProjectChatsChildrenExtension,
  createProjectChatsExtension,
} from './app-graph-builder.ts';

describe('project chats graph extension', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setupTestContext = async () => {
    const { db } = await builder.createDatabase({ types: [Project.Project, Chat.Chat, Feed.Feed] });
    const project = db.add(Project.make({ name: 'Test' }));
    await db.flush();

    // The real graph's shape around a project (`root/<space>/ai/<project typename>/<id>`), since the
    // chat URL binding resolves a chat id back to a path of that shape.
    const sectionPath = [GraphPath.GroupSegments.ai, Type.getTypename(Project.Project)];
    const rootExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testRoot',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: db.spaceId, type: 'test-space' }]),
      }),
    );
    const spaceExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testSpace',
        match: GraphNodeMatcher.whenNodeType('test-space'),
        connector: () => Effect.succeed([{ id: sectionPath[0], type: 'test-group' }]),
      }),
    );
    const groupExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testGroup',
        match: GraphNodeMatcher.whenNodeType('test-group'),
        connector: () => Effect.succeed([{ id: sectionPath[1], type: 'test-section' }]),
      }),
    );
    const sectionExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testSection',
        match: GraphNodeMatcher.whenNodeType('test-section'),
        connector: () => Effect.succeed([{ id: project.id, type: 'test', data: project }]),
      }),
    );
    const chatExtensions = await EffectEx.runPromise(createProjectChatsExtension());
    const chatChildrenExtensions = await EffectEx.runPromise(
      createProjectChatsChildrenExtension({ getDatabase: (spaceId) => (spaceId === db.spaceId ? db : undefined) }),
    );
    const context = setupGraphBuilder({
      extensions: [
        ...rootExtensions,
        ...spaceExtensions,
        ...groupExtensions,
        ...sectionExtensions,
        ...chatExtensions,
        ...chatChildrenExtensions,
      ],
    });

    // The chats hang off a virtual Chats branch, not the project row, so every level is expanded.
    const projectNodeId = GraphPath.getSpacePath(db.spaceId, ...sectionPath, project.id);
    const chatsNodeId = GraphNode.qualifyId(projectNodeId, CHATS_SEGMENT);
    for (const nodeId of [
      GraphNode.RootId,
      ...sectionPath.map((_, index) => GraphPath.getSpacePath(db.spaceId, ...sectionPath.slice(0, index))),
    ]) {
      await context.expand(nodeId);
    }
    await context.expand(GraphPath.getSpacePath(db.spaceId, ...sectionPath));
    await context.expand(projectNodeId);
    await context.expand(chatsNodeId);

    const addChat = async (name: string) => {
      const feed = db.add(Feed.make());
      const chat = db.add(Chat.make({ name, feed: Ref.make(feed) }));
      Chat.linkCompanion({ chat, subject: project });
      await db.flush();
      await context.flush();
      return chat;
    };

    return {
      ...context,
      db,
      project,
      addChat,
      projectNodeId,
      chatsNodeId,
      getChildIds: () => context.getConnections(chatsNodeId).map((node) => node.id),
    };
  };

  test('a project always carries the Chats branch, empty or not', async ({ expect }) => {
    const { projectNodeId, chatsNodeId, getConnections, getChildIds } = await setupTestContext();

    // The branch is what the reader clicks into, so it exists before there is anything under it.
    expect(getConnections(projectNodeId).map((node) => node.id)).toEqual([chatsNodeId]);
    expect(getChildIds()).toEqual([]);
  });

  test('re-emits when a chat is newly parented to the project', async ({ expect }) => {
    const { addChat, getChildIds, chatsNodeId } = await setupTestContext();

    // The connector reads a hierarchy query rather than a ref array, so it must re-run when a chat
    // is newly parented.
    const chat = await addChat('First');
    expect(getChildIds()).toEqual([GraphNode.qualifyId(chatsNodeId, chat.id)]);

    const second = await addChat('Second');
    expect(getChildIds()).toHaveLength(2);
    expect(getChildIds()).toContain(GraphNode.qualifyId(chatsNodeId, second.id));
  });

  test('excludes non-chat children of the project', async ({ expect }) => {
    const { db, project, addChat, getChildIds, flush, chatsNodeId } = await setupTestContext();
    const chat = await addChat('Chat');

    // Owned Instructions/task sets are parented to a project too; only chats are navtree children.
    const other = db.add(Feed.make({ [Obj.Parent]: project }));
    await db.flush();
    await flush();

    expect(getChildIds()).toEqual([GraphNode.qualifyId(chatsNodeId, chat.id)]);
  });

  test('a project chat is addressable by URL: `chat/<id>` resolves to the node and back', async ({ expect }) => {
    const { db, builder, addChat, chatsNodeId } = await setupTestContext();
    const chat = await addChat('Chat');
    const chatNodeId = GraphNode.qualifyId(chatsNodeId, chat.id);

    // Reverse: the deck serializes the open plank into the URL, which is what fails with "node has
    // no URL binding" when the connector declares none.
    const represented = PathResolution.representNode(builder, chatNodeId);
    expect(Option.getOrUndefined(represented)).toEqual({ key: 'chat', id: chat.id, workspace: db.spaceId });

    // Forward: a fresh graph resolves the pair back to the same node.
    const [resolved] = await EffectEx.runPromise(
      PathResolution.resolveUrl(builder, {
        workspace: db.spaceId,
        pairs: [{ key: 'chat', id: chat.id, workspace: db.spaceId }],
      }),
    );
    expect(resolved?.nodeId).toEqual(chatNodeId);
  });
});
