//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import type { Operation } from '@dxos/operation';
import { OperationHandlerSet } from '@dxos/operation';

import { Capabilities } from '../../common';
import { usePluginManager } from '../components';

/**
 * Hook to dynamically register an operation handler within a React component.
 * The handler is added when the component mounts and removed when it unmounts.
 *
 * @example
 * ```tsx
 * const scrollHandler = useMemo(() => Operation.withHandler(
 *   LayoutOperation.ScrollIntoView,
 *   (input) => Effect.sync(() => {
 *     // Handle scroll
 *   }),
 * ), [deps]);
 *
 * useOperationResolver(meta.id, scrollHandler);
 * ```
 */
export const useOperationResolver = (module: string, handler: Operation.WithHandler<Operation.Definition.Any>) => {
  const manager = usePluginManager();
  const handlerSet = useMemo(() => OperationHandlerSet.make(handler), [handler]);

  useEffect(() => {
    manager.capabilities.contribute({
      module,
      interface: Capabilities.OperationHandler,
      implementation: handlerSet,
    });

    return () => manager.capabilities.remove(Capabilities.OperationHandler, handlerSet);
  }, [module, handlerSet]);
};
