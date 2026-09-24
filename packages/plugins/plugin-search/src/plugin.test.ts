//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Client } from '@dxos/client';
import { DXN, Key } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Attention } from '@dxos/react-ui-attention/types';

import { SearchPlugin } from '#plugin';

const makeUninitializedClientHostPlugin = (client: Client) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.host'), name: 'Host' })).pipe(
    Plugin.addModule({
      id: 'host',
      provides: [ClientCapabilities.Client, AppCapabilities.Layout],
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed([
          Capability.contribute(ClientCapabilities.Client, client),
          Capability.contribute(
            AppCapabilities.Layout,
            Atom.make<AppCapabilities.Layout>({
              mode: 'test',
              dialogOpen: false,
              sidebarOpen: false,
              complementarySidebarOpen: true,
              workspace: GraphPath.getSpacePath(Key.SpaceId.random()),
              active: [],
              inactive: [],
              scrollIntoView: undefined,
            }),
          ),
        ]),
    }),
    Plugin.make,
  );

describe('SearchPlugin', () => {
  test('contributes the search deck companion before the client initializes', async ({ expect }) => {
    const client = new Client();
    await using harness = await createComposerTestApp({
      plugins: [makeUninitializedClientHostPlugin(client)(), SearchPlugin()],
    });

    const builder = await harness.waitForCapability(AppCapabilities.AppGraph);
    const registry = harness.get(Capabilities.AtomRegistry);
    AppGraph.expandSync(builder.graph, GraphNode.RootId, AppNode.companion);
    await AppGraphBuilder.flush(builder);

    expect(client.initialized).toBe(false);
    const companion = registry
      .get(builder.graph.connections(GraphNode.RootId, AppNode.companion))
      .find((node) => node.id.endsWith(Attention.linkedSegment('search')));
    expect(companion).toBeDefined();
    expect(companion?.data).toBeNull();
  });
});
