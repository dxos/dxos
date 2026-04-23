//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: 'org.dxos.plugin.simple-layout.not-found',
      match: NodeMatcher.whenRoot,
      connector: () => Effect.succeed([AppNode.makeNotFound()]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
