//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { getSpace } from '@dxos/client/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import { SheetCapabilities } from '#types';

import { computeGraphFacet } from '../extensions/index.ts';

export const Markdown = Capability.makeModule(
  'MarkdownExtension',
  {
    // The provider callbacks read the registry, so it must be in place when this activates.
    requires: [SheetCapabilities.ComputeGraphRegistry],
    provides: [MarkdownCapabilities.ExtensionProvider],
    activatesOn: MarkdownEvents.Start,
  },
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc }) => {
        const computeGraphRegistry = capabilities.get(SheetCapabilities.ComputeGraphRegistry);
        const space = getSpace(doc);
        if (space) {
          const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
          return computeGraphFacet.of(computeGraph);
        }
      },
    ]);
  }),
);
