//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'org.dxos.plugin.simpleLayout.notFound',
      match: GraphNodeMatcher.whenRoot,
      connector: () => Effect.succeed([AppNode.makeNotFound()]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
