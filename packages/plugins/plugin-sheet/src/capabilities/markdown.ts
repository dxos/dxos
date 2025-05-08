//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';

import { SheetCapabilities } from './capabilities';
import { computeGraphFacet } from '../extensions';

export default (context: PluginsContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document: doc }) => {
      const computeGraphRegistry = context.requestCapability(SheetCapabilities.ComputeGraphRegistry);
      const space = getSpace(doc);
      if (space) {
        const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
        return computeGraphFacet.of(computeGraph);
      }
    },
  ]);
