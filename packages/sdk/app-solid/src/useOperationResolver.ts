//
// Copyright 2025 DXOS.org
//

import { createEffect, onCleanup } from 'solid-js';

import { Common } from '@dxos/app-framework';
import { type OperationResolver } from '@dxos/operation';

import { usePluginManager } from './usePluginManager';

export const useOperationResolver = (module: string, resolver: OperationResolver.OperationResolver) => {
  const manager = usePluginManager();

  createEffect(() => {
    const implementation = [resolver];

    manager.capabilities.contribute({
      module,
      interface: Common.Capability.OperationResolver,
      implementation,
    });

    onCleanup(() => {
      manager.capabilities.remove(Common.Capability.OperationResolver, implementation);
    });
  });
};
