//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, onTestFinished, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { Devtools } from '#types';

import { DEVTOOLS_URL_KEY, createDevtoolsExtension } from './app-graph-builder.ts';

describe('devtools graph extension', () => {
  const setup = async () => {
    const testBuilder = new TestBuilder();
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    await space.waitUntilReady();
    onTestFinished(async () => {
      await client.destroy();
      await testBuilder.destroy();
    });

    // Stand-ins for the space plugin's navtree: root -> space -> system group (carrying the space).
    const rootExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testRoot',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: space.id, type: 'test-space' }]),
      }),
    );
    const spaceExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testSpace',
        match: GraphNodeMatcher.whenNodeType('test-space'),
        connector: () =>
          Effect.succeed([
            { id: GraphPath.GroupSegments.system, type: GraphPath.GroupTypes.system, properties: { space } },
          ]),
      }),
    );
    const devtoolsExtensions = await EffectEx.runPromise(
      createDevtoolsExtension(Atom.make<AppCapabilities.AppGraph[]>([])),
    );
    const context = setupGraphBuilder({
      extensions: [...rootExtensions, ...spaceExtensions, ...devtoolsExtensions],
    });

    const systemNodeId = GraphPath.getSpacePath(space.id, GraphPath.GroupSegments.system);
    const devtoolsNodeId = GraphNode.qualifyId(systemNodeId, Devtools.nodeId(Devtools.id));
    await context.expand(GraphNode.RootId);
    await context.expand(GraphPath.getSpacePath(space.id));
    await context.expand(systemNodeId);
    await context.expand(devtoolsNodeId);

    return { ...context, space, devtoolsNodeId };
  };

  test('every devtools page has a URL binding and resolves back to itself', async ({ expect }) => {
    const { builder, space, devtoolsNodeId, expand } = await setup();
    const clientNodeId = GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.Client.id));
    await expand(clientNodeId);

    const cases = [
      [GraphNode.qualifyId(devtoolsNodeId, Devtools.nodeId(Devtools.AppGraph)), Devtools.nodeId(Devtools.AppGraph)],
      [
        GraphNode.qualifyId(clientNodeId, Devtools.nodeId(Devtools.Client.Config)),
        [Devtools.nodeId(Devtools.Client.id), Devtools.nodeId(Devtools.Client.Config)].join('+'),
      ],
    ] as const;
    for (const [nodeId, id] of cases) {
      expect(Option.getOrUndefined(PathResolution.representNode(builder, nodeId))).toEqual({
        key: DEVTOOLS_URL_KEY,
        id,
        workspace: space.id,
      });
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: space.id,
          pairs: [{ key: DEVTOOLS_URL_KEY, id, workspace: space.id }],
        }),
      );
      expect(resolved?.nodeId).toEqual(nodeId);
    }
  });

  test('the devtools container itself is not addressable', async ({ expect }) => {
    const { builder, devtoolsNodeId } = await setup();
    expect(Option.isNone(PathResolution.representNode(builder, devtoolsNodeId))).toBe(true);
  });
});
