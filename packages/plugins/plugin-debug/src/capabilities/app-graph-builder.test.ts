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

import { createDebugRootExtension, createDebugToolsExtension } from './app-graph-builder.ts';

describe('debug graph extensions', () => {
  const setup = async () => {
    const rootExtensions = await EffectEx.runPromise(createDebugRootExtension());
    const toolExtensions = await EffectEx.runPromise(createDebugToolsExtension());
    const context = setupGraphBuilder({ extensions: [...rootExtensions, ...toolExtensions] });
    await context.expand(GraphNode.RootId);
    await context.expand(DebugNodes.DEBUG_ROOT_ID);
    return context;
  };

  test('root/debug is a hidden root child', async ({ expect }) => {
    const { graph } = await setup();
    const node = Option.getOrThrow(AppGraph.getNode(graph, DebugNodes.DEBUG_ROOT_ID));
    expect(AppGraphNode.hasDisposition(node, 'hidden')).toBe(true);
    expect(node.data).toBeNull();
  });

  test('console and logs are its first children, in that order', async ({ expect }) => {
    const { getConnections } = await setup();
    const ids = getConnections(DebugNodes.DEBUG_ROOT_ID).map((node) => node.id);
    expect(ids.slice(0, 2)).toEqual([
      `${DebugNodes.DEBUG_ROOT_ID}/${DebugNodes.nodeId(DebugNodes.Console)}`,
      `${DebugNodes.DEBUG_ROOT_ID}/${DebugNodes.nodeId(DebugNodes.Logs)}`,
    ]);
  });
});
