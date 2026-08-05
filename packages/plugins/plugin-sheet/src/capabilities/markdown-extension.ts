//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { getSpace } from '@dxos/client/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

import { computeGraphFacet } from '../extensions';
import * as SheetCapabilities from '../types/SheetCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc }) => {
        // Tolerant lookup: this provider is gated on MARKDOWN start but the registry on SHEET
        // start, so opening a document before any sheet runs this with the registry absent — a
        // strict `get` throws there and takes the whole plank down. Formulas in the document go
        // un-evaluated until the sheet plugin starts, which is the correct degraded behaviour.
        const [computeGraphRegistry] = capabilities.getAll(SheetCapabilities.ComputeGraphRegistry);
        const space = getSpace(doc);
        if (computeGraphRegistry && space) {
          const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
          return computeGraphFacet.of(computeGraph);
        }
      },
    ]);
  }),
);
