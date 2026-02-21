//
// Copyright 2025 DXOS.org
//

import { createEffect, onCleanup } from 'solid-js';

import { Capabilities } from '@dxos/app-framework';
import { type OperationResolver } from '@dxos/operation';

import { usePluginManager } from './usePluginManager';

export const useOperationResolver = (module: string, resolver: OperationResolver.OperationResolver) => {
  const manager = usePluginManager();

  createEffect(() => {
    const implementation = [resolver];

    manager.capabilities.contribute({
      module,
      interface: Capabilities.OperationResolver,
      implementation,
    });

    onCleanup(() => {
      manager.capabilities.remove(Capabilities.OperationResolver, implementation);
    });
  });
};
