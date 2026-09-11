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
  ARTIFACTS_SEGMENT,
  CHATS_SEGMENT,
  createProjectArtifactsActionExtension,
  createProjectArtifactsExtension,
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
    const chatChildrenExtensions = await EffectEx.runPromise(createProjectChatsChildrenExtension());
    const artifactExtensions = await EffectEx.runPromise(createProjectArtifactsExtension());
    const artifactChildrenExtensions = await EffectEx.runPromise(createProjectArtifactsActionExtension());
    const context = setupGraphBuilder({
      extensions: [
        ...rootExtensions,
        ...spaceExtensions,
        ...groupExtensions,
        ...sectionExtensions,
        ...chatExtensions,
        ...chatChildrenExtensions,
        ...artifactExtensions,
        ...artifactChildrenExtensions,
      ],
    });

    // The chats hang off a virtual Chats branch, not the project row, so every level is expanded.
    const projectNodeId = GraphPath.getSpacePath(db.spaceId, ...sectionPath, project.id);
    const chatsNodeId = GraphNode.qualifyId(projectNodeId, CHATS_SEGMENT);
    const artifactsNodeId = GraphNode.qualifyId(projectNodeId, ARTIFACTS_SEGMENT);
    for (const nodeId of [
      GraphNode.RootId,
      ...sectionPath.map((_, index) => GraphPath.getSpacePath(db.spaceId, ...sectionPath.slice(0, index))),
    ]) {
      await context.expand(nodeId);
    }
    await context.expand(GraphPath.getSpacePath(db.spaceId, ...sectionPath));
    await context.expand(projectNodeId);
    await context.expand(chatsNodeId);
    await context.expand(artifactsNodeId);

    const addArtifact = async () => {
      const artifact = db.add(Feed.make());
      Obj.update(project, (project) => {
        project.artifacts.push(Ref.make(artifact));
      });
      await db.flush();
      await context.flush();
      await context.expand(artifactsNodeId);
      return artifact;
    };

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
      addArtifact,
      projectNodeId,
      chatsNodeId,
      artifactsNodeId,
      getChildIds: () => context.getConnections(chatsNodeId).map((node) => node.id),
    };
  };

  test('a project always carries the Chats branch, empty or not', async ({ expect }) => {
    const { projectNodeId, chatsNodeId, artifactsNodeId, getConnections, getChildIds } = await setupTestContext();

    // The branches are what the reader clicks into, so they exist before there is anything under them.
    expect(getConnections(projectNodeId).map((node) => node.id)).toEqual([chatsNodeId, artifactsNodeId]);
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

  test('a project chat is addressable by URL: `project-session/<id>` resolves to the node and back', async ({
    expect,
  }) => {
    const { db, project, builder, addChat, chatsNodeId } = await setupTestContext();
    const chat = await addChat('Chat');
    const chatNodeId = GraphNode.qualifyId(chatsNodeId, chat.id);
    // The project and the branch sit between the binding's static path and the chat, so they ride in
    // the pair's id rather than needing a resolver.
    const pairId = [project.id, CHATS_SEGMENT, chat.id].join('+');

    // Reverse: the deck serializes the open plank into the URL, which is what fails with "node has
    // no URL binding" when the connector declares none.
    const represented = PathResolution.representNode(builder, chatNodeId);
    expect(Option.getOrUndefined(represented)).toEqual({ key: 'project-session', id: pairId, workspace: db.spaceId });

    // Forward: a fresh graph resolves the pair back to the same node.
    const [resolved] = await EffectEx.runPromise(
      PathResolution.resolveUrl(builder, {
        workspace: db.spaceId,
        pairs: [{ key: 'project-session', id: pairId, workspace: db.spaceId }],
      }),
    );
    expect(resolved?.nodeId).toEqual(chatNodeId);
  });

  test('the branch rows are addressable too, at the id their children extend', async ({ expect }) => {
    const { db, project, builder, chatsNodeId, artifactsNodeId } = await setupTestContext();

    // Both rows are selectable (they open their contents as cards), so both need an address; without
    // one, clicking Sessions logs "node has no URL binding" and does nothing.
    for (const [nodeId, key, segment] of [
      [chatsNodeId, 'project-session', CHATS_SEGMENT],
      [artifactsNodeId, 'project-artifact', ARTIFACTS_SEGMENT],
    ] as const) {
      const pairId = [project.id, segment].join('+');
      expect(Option.getOrUndefined(PathResolution.representNode(builder, nodeId))).toEqual({
        key,
        id: pairId,
        workspace: db.spaceId,
      });

      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: db.spaceId,
          pairs: [{ key, id: pairId, workspace: db.spaceId }],
        }),
      );
      expect(resolved?.nodeId).toEqual(nodeId);
    }
  });

  test('a project artifact is addressable by URL under its own key', async ({ expect }) => {
    const { db, project, builder, addArtifact, artifactsNodeId } = await setupTestContext();
    const artifact = await addArtifact();
    const artifactNodeId = GraphNode.qualifyId(artifactsNodeId, artifact.id);
    const pairId = [project.id, ARTIFACTS_SEGMENT, artifact.id].join('+');

    const represented = PathResolution.representNode(builder, artifactNodeId);
    expect(Option.getOrUndefined(represented)).toEqual({ key: 'project-artifact', id: pairId, workspace: db.spaceId });

    const [resolved] = await EffectEx.runPromise(
      PathResolution.resolveUrl(builder, {
        workspace: db.spaceId,
        pairs: [{ key: 'project-artifact', id: pairId, workspace: db.spaceId }],
      }),
    );
    expect(resolved?.nodeId).toEqual(artifactNodeId);
  });
});
