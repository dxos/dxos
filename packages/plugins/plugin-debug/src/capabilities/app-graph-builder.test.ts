//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';

import { DebugNodes } from '#types';

import { createDebugExtension, createDebugRootExtension } from './app-graph-builder.ts';

describe('debug graph extensions', () => {
  const setup = async () => {
    const rootExtensions = await EffectEx.runPromise(createDebugRootExtension());
    const debugExtensions = await EffectEx.runPromise(createDebugExtension());
    const context = setupGraphBuilder({ extensions: [...rootExtensions, ...debugExtensions] });
    await context.expand(GraphNode.RootId);
    await context.expand(DebugNodes.DEBUG_ROOT_ID);
    await context.expand(DebugNodes.DEBUG_NODE_ID);
    return context;
  };

  test('root/debug is a hidden root child', async ({ expect }) => {
    const { graph } = await setup();
    const node = Option.getOrThrow(AppGraph.getNode(graph, DebugNodes.DEBUG_ROOT_ID));
    expect(AppGraphNode.hasDisposition(node, 'hidden')).toBe(true);
    expect(node.data).toBeNull();
  });

  test('the Debug node hosts console, logs, then the generator', async ({ expect }) => {
    const { getConnections } = await setup();
    expect(getConnections(DebugNodes.DEBUG_ROOT_ID).map((node) => node.id)).toEqual([DebugNodes.DEBUG_NODE_ID]);
    expect(getConnections(DebugNodes.DEBUG_NODE_ID).map((node) => node.id)).toEqual([
      DebugNodes.CONSOLE_NODE_ID,
      `${DebugNodes.DEBUG_NODE_ID}/${DebugNodes.nodeId(DebugNodes.Logs)}`,
      `${DebugNodes.DEBUG_NODE_ID}/${DebugNodes.nodeId(DebugNodes.SpaceType)}`,
    ]);
  });
});
