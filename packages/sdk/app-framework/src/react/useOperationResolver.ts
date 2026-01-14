//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import type { OperationResolver } from '@dxos/operation';

import * as Common from '../common';
import { usePluginManager } from '../react';

/**
 * Hook to dynamically register an operation resolver (handler) within a React component.
 * The resolver is added when the component mounts and removed when it unmounts.
 *
 * @example
 * ```tsx
 * const scrollHandler = useMemo(() => OperationResolver.make({
 *   operation: LayoutOperation.ScrollIntoView,
 *   handler: (input) => Effect.sync(() => {
 *     // Handle scroll
 *   }),
 * }), [deps]);
 *
 * useOperationResolver(meta.id, scrollHandler);
 * ```
 */
export const useOperationResolver = (module: string, resolver: OperationResolver.OperationResolver) => {
  const manager = usePluginManager();
  // Wrap single resolver in array as the capability expects an array.
  const resolverArray = useMemo(() => [resolver], [resolver]);

  useEffect(() => {
    manager.context.contributeCapability({
      module,
      interface: Common.Capability.OperationResolver,
      implementation: resolverArray,
    });

    return () => manager.context.removeCapability(Common.Capability.OperationResolver, resolverArray);
  }, [module, resolverArray]);
};
