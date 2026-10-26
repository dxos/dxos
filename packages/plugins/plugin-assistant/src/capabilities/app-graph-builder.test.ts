//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import { Feed, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { ASSISTANT_COMPANION_VARIANT } from '#meta';

import { createPromptExtension } from './app-graph-builder.ts';

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
