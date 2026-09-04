//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { CHATS_SEGMENT, createProjectChatsChildrenExtension, createProjectChatsExtension } from './app-graph-builder';

const PROJECT_ID = 'project';

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

    const rootExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testRoot',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: PROJECT_ID, type: 'test', data: project }]),
      }),
    );
    const chatExtensions = await EffectEx.runPromise(createProjectChatsExtension());
    const chatChildrenExtensions = await EffectEx.runPromise(createProjectChatsChildrenExtension());
    const context = setupGraphBuilder({
      extensions: [...rootExtensions, ...chatExtensions, ...chatChildrenExtensions],
    });

    // The chats hang off a virtual Chats branch, not the project row, so both levels are expanded.
    const projectNodeId = GraphNode.qualifyId(GraphNode.RootId, PROJECT_ID);
    const chatsNodeId = GraphNode.qualifyId(projectNodeId, CHATS_SEGMENT);
    await context.expand(GraphNode.RootId);
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
    const other = db.add(Feed.make());
    Obj.setParent(other, project);
    await db.flush();
    await flush();

    expect(getChildIds()).toEqual([GraphNode.qualifyId(chatsNodeId, chat.id)]);
  });
});
