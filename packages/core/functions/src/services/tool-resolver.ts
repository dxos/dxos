//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { type ToolResolver } from '@dxos/ai';

export class ToolResolverService extends Context.Tag('ToolResolverService')<
  ToolResolverService,
  {
    /**
     * Tool resolver.
     */
    readonly toolResolver: ToolResolver;
  }
>() {
  static notAvailable: Context.Tag.Service<ToolResolverService> = {
    toolResolver: {
      resolve: async (id: string) => {
        throw new Error('Tool resolver not available');
      },
    },
  };

  static make = (toolResolver: ToolResolver): Context.Tag.Service<ToolResolverService> => {
    return {
      toolResolver,
    };
  };
}
