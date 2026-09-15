//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Attention } from '@dxos/react-ui-attention/types';

import { SearchPlugin } from '#plugin';

describe('SearchPlugin', () => {
  test('contributes the search deck companion once the client initializes', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), SearchPlugin()],
    });

    await harness.waitForEvent(ClientEvents.Initialized);
    const builder = await harness.waitForCapability(AppCapabilities.AppGraph);
    const registry = harness.get(Capabilities.AtomRegistry);
    AppGraph.expandSync(builder.graph, GraphNode.RootId, 'child');
    await AppGraphBuilder.flush(builder);

    const companion = registry
      .get(builder.graph.connections(GraphNode.RootId, 'child'))
      .find((node) => node.id.endsWith(Attention.linkedSegment('search')));
    expect(companion).toBeDefined();
    // No workspace is open, so the companion carries no space.
    expect(companion?.data).toBeNull();
  });
});
