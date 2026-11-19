//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import { describe, expect, onTestFinished, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Client } from '@dxos/client';
import * as Instructions from '@dxos/compute/Instructions';
import { Feed, Obj, Ref, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { ASSISTANT_COMPANION_VARIANT } from '../constants.ts';
import { createChatSectionExtensions, createPromptExtension } from './app-graph-builder.ts';

describe('prompt extension', () => {
  test('a prompt node goes under each node that hosts a chat prompt, and no other', async ({ expect }) => {
    const companion = (variant: string) => AppNode.makeCompanion({ variant, label: variant, icon: '', data: null });
    const agent = Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ text: '' })) });
    const hosts: [AppGraphNode.NodeArg<unknown>, boolean][] = [
      [{ id: 'chat', type: 'test.chat', data: Chat.make({ feed: Ref.make(Feed.make()) }), properties: {} }, true],
      [{ id: 'agent', type: 'test.agent', data: agent, properties: {} }, true],
      [companion(ASSISTANT_COMPANION_VARIANT), true],
      [{ id: 'home', type: SpaceSchema.SPACE_HOME_NODE_TYPE, data: null, properties: {} }, true],
      [companion('help'), false],
    ];
    const stub = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testHosts',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed(hosts.map(([host]) => host)),
      }),
    );
    const extension = await EffectEx.runPromise(createPromptExtension());
    const graph = setupGraphBuilder({ extensions: [...stub, ...extension] });
    await graph.expand(GraphNode.RootId);

    for (const [host, hostsPrompt] of hosts) {
      const hostId = GraphNode.qualifyId(GraphNode.RootId, host.id);
      await graph.expand(hostId);
      expect(graph.getNode(AppNode.getPromptId(hostId))?.type === AppNode.PROMPT_TYPE, host.id).toBe(hostsPrompt);
    }
  });
});

describe('chat section', () => {
  const setup = async (readOnly: boolean) => {
    const client = await new Client({ types: [Chat.Chat, Feed.Feed] }).initialize();
    onTestFinished(() => client.destroy());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    await space.waitUntilReady();
    const chat = space.db.add(Chat.make({ name: 'Published', feed: Ref.make(space.db.add(Feed.make())) }));
    await space.db.flush({ indexes: true });

    const root = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testSpaces',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: space.id, type: SpaceSchema.SPACE_TYPE, data: space, properties: {} }]),
      }),
    );
    const extensions = await EffectEx.runPromise(createChatSectionExtensions(Atom.make(readOnly)));
    const graph = setupGraphBuilder({ extensions: [...root, ...extensions] });
    const groupId = GraphNode.qualifyId(GraphNode.RootId, space.id, GraphPath.GroupSegments.ai);
    const sectionId = GraphNode.qualifyId(groupId, Type.getTypename(Chat.Chat));
    await graph.expand(GraphNode.RootId);
    await graph.expand(GraphNode.qualifyId(GraphNode.RootId, space.id));
    await expect
      .poll(async () => {
        await graph.expand(groupId);
        return graph.getNode(sectionId);
      })
      .not.toBeNull();
    await graph.expand(sectionId);
    await graph.expand(sectionId, 'action');

    return { graph, chat, groupId, sectionId };
  };

  test('read-only, the AI group lists the chats with no create action', async ({ expect }) => {
    const { graph, chat, groupId, sectionId } = await setup(true);
    expect(graph.getNode(groupId)?.type).toBe(GraphPath.GroupTypes.ai);
    expect(graph.getConnections(sectionId).map((node) => node.data)).toEqual([chat]);
    expect(graph.registry.get(graph.graph.actions(sectionId))).toEqual([]);
  });

  test('writable, the Chats section offers create', async ({ expect }) => {
    const { graph, sectionId } = await setup(false);
    expect(graph.registry.get(graph.graph.actions(sectionId)).map((action) => GraphNode.segmentId(action.id))).toEqual([
      'create-chat',
    ]);
  });
});
