//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ReactElement } from 'react';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { createMicExtensions } from './app-graph-builder.tsx';

describe('mic extensions', () => {
  test('a prompt node gets the prompt mic, keyed by the prompt node', async ({ expect }) => {
    const stub = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testPrompt',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([AppNode.makePrompt()]),
      }),
    );
    const extensions = await EffectEx.runPromise(createMicExtensions());
    const graph = setupGraphBuilder({ extensions: [...stub, ...extensions.flat()] });
    const promptId = AppNode.getPromptId(GraphNode.RootId);
    await graph.expand(GraphNode.RootId);
    await graph.expand(promptId, 'action');

    const [mic] = graph.getConnections(promptId, 'action').filter(AppGraphNode.isAction);
    expect(AppGraphNode.hasDisposition(mic, 'prompt')).toBe(true);
    expect((mic.properties.render() as ReactElement<{ docId: string }>).props.docId).toBe(promptId);
  });
});
