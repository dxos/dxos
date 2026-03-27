//
// Copyright 2025 DXOS.org
//

import { createEffect, onCleanup } from 'solid-js';

import { Capabilities } from '@dxos/app-framework';
import { type Operation, OperationHandlerSet } from '@dxos/operation';

import { usePluginManager } from './usePluginManager';

export const useOperationResolver = (module: string, handler: Operation.WithHandler<Operation.Definition.Any>) => {
  const manager = usePluginManager();

  createEffect(() => {
    const implementation = OperationHandlerSet.make(handler);

    manager.capabilities.contribute({
      module,
      interface: Capabilities.OperationHandler,
      implementation,
    });

    onCleanup(() => {
      manager.capabilities.remove(Capabilities.OperationHandler, implementation);
    });
  });
};
