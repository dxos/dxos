//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: 'org.dxos.plugin.simpleLayout.notFound',
      match: NodeMatcher.whenRoot,
      connector: () => Effect.succeed([AppNode.makeNotFound()]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
