//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { qualifyId } from '@dxos/app-graph';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { Chat } from '@dxos/assistant-toolkit';
import { Project } from '@dxos/compute';
import { Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { createProjectChatsExtension } from './app-graph-builder';

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
      GraphBuilder.createExtension({
        id: 'testRoot',
        match: NodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: PROJECT_ID, type: 'test', data: project }]),
      }),
    );
    const chatExtensions = await EffectEx.runPromise(createProjectChatsExtension());
    const context = setupGraphBuilder({ extensions: [...rootExtensions, ...chatExtensions] });

    await context.expand(Node.RootId);
    await context.expand(qualifyId(Node.RootId, PROJECT_ID));

    const addChat = async (name: string) => {
      const feed = db.add(Feed.make());
      const chat = db.add(Chat.make({ name, feed: Ref.make(feed) }));
      Obj.setParent(chat, project);
      await db.flush();
      await context.flush();
      return chat;
    };

    return {
      ...context,
      db,
      project,
      addChat,
      getChildIds: () => context.getConnections(qualifyId(Node.RootId, PROJECT_ID)).map((node) => node.id),
    };
  };

  test('a project with no chats has no children', async ({ expect }) => {
    const { getChildIds } = await setupTestContext();
    expect(getChildIds()).toEqual([]);
  });

  test('re-emits when a chat is newly parented to the project', async ({ expect }) => {
    const { addChat, getChildIds } = await setupTestContext();

    // The risk this extension was flagged for: the connector reads a hierarchy query rather than a
    // ref array, so a newly parented chat has to re-run it. Falling back to a `chats` Collection
    // field on Project would only be necessary if this failed.
    const chat = await addChat('First');
    expect(getChildIds()).toEqual([qualifyId(Node.RootId, PROJECT_ID, chat.id)]);

    const second = await addChat('Second');
    expect(getChildIds()).toHaveLength(2);
    expect(getChildIds()).toContain(qualifyId(Node.RootId, PROJECT_ID, second.id));
  });

  test('excludes non-chat children of the project', async ({ expect }) => {
    const { db, project, addChat, getChildIds, flush } = await setupTestContext();
    const chat = await addChat('Chat');

    // Owned Instructions/Collections are parented to a project too; only chats are navtree children.
    const other = db.add(Feed.make());
    Obj.setParent(other, project);
    await db.flush();
    await flush();

    expect(getChildIds()).toEqual([qualifyId(Node.RootId, PROJECT_ID, chat.id)]);
  });
});
