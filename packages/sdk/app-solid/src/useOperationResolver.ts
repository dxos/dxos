//
// Copyright 2025 DXOS.org
//

import { createEffect, onCleanup } from 'solid-js';

import { Common, type OperationResolver } from '@dxos/app-framework';

import { usePluginManager } from './usePluginManager';

export const useOperationResolver = (module: string, resolver: OperationResolver.OperationResolver) => {
  const manager = usePluginManager();

  createEffect(() => {
    const implementation = [resolver];

    manager.context.contributeCapability({
      module,
      interface: Common.Capability.OperationResolver,
      implementation,
    });

    onCleanup(() => {
      manager.context.removeCapability(Common.Capability.OperationResolver, implementation);
    });
  });
};
