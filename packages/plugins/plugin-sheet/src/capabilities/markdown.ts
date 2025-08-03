//
// Copyright 2025 DXOS.org
//

import { type PluginContext, contributes } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';

import { computeGraphFacet } from '../extensions';

import { SheetCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document: doc }) => {
      const computeGraphRegistry = context.getCapability(SheetCapabilities.ComputeGraphRegistry);
      const space = getSpace(doc);
      if (space) {
        const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
        return computeGraphFacet.of(computeGraph);
      }
    },
  ]);
