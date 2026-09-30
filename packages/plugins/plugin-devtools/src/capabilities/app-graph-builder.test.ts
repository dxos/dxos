//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { Devtools } from '#types';

import { createDevtoolsExtension } from './app-graph-builder.ts';

describe('devtools graph extension', () => {
  const setup = async () => {
    // Stand-in for plugin-debug's root extension: root -> hidden debug category.
    const rootExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testRoot',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            {
              id: GraphPath.GroupSegments.debug,
              type: GraphPath.GroupTypes.debug,
              data: null,
              properties: { disposition: 'hidden' },
            },
          ]),
      }),
    );
    const devtoolsExtensions = await EffectEx.runPromise(
      createDevtoolsExtension(Atom.make<AppCapabilities.AppGraph[]>([])),
    );
    const context = setupGraphBuilder({ extensions: [...rootExtensions, ...devtoolsExtensions] });
    const debugRootId = `${GraphNode.RootId}/${GraphPath.GroupSegments.debug}`;
    const devtoolsNodeId = GraphNode.qualifyId(debugRootId, Devtools.nodeId(Devtools.id));
    await context.expand(GraphNode.RootId);
    await context.expand(debugRootId);
    await context.expand(devtoolsNodeId);

    return { ...context, devtoolsNodeId };
  };

  test('the devtools tree hangs off the debug category', async ({ expect }) => {
    const { getConnections, devtoolsNodeId } = await setup();
    const ids = getConnections(devtoolsNodeId).map((node) => node.id);
    expect(ids).toContain(GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.AppGraph)));
    expect(ids).toContain(GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.Client.id)));
  });

  test('getNodePath names the node the tree builds', async ({ expect }) => {
    const { expand, getNode, devtoolsNodeId } = await setup();
    expect(Devtools.getNodePath(Devtools.id)).toBe(devtoolsNodeId);
    await expand(Devtools.getNodePath(Devtools.Echo.id));
    for (const id of [Devtools.AppGraph, Devtools.Echo.id, Devtools.Echo.Space, Devtools.Echo.Feeds]) {
      expect(getNode(Devtools.getNodePath(id))).not.toBeNull();
    }
  });

  test('devtools pages have no URL representation', async ({ expect }) => {
    const { builder, devtoolsNodeId } = await setup();
    const pageId = GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.AppGraph));
    expect(Option.isNone(PathResolution.representNode(builder, pageId))).toBe(true);
  });
});
