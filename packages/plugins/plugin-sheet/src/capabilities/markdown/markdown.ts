//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';

import { computeGraphFacet } from '../../extensions';
import { SheetCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(MarkdownCapabilities.Extensions, [
      ({ document: doc }) => {
        const computeGraphRegistry = context.getCapability(SheetCapabilities.ComputeGraphRegistry);
        const space = getSpace(doc);
        if (space) {
          const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
          return computeGraphFacet.of(computeGraph);
        }
      },
    ]);
  }),
);
