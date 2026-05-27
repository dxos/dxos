//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { DXN } from '@dxos/keys';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: DXN.make('org.dxos.plugin.simpleLayout.notFound'),
      match: NodeMatcher.whenRoot,
      connector: () => Effect.succeed([AppNode.makeNotFound()]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
