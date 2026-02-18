//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { Capabilities } from '../../common';
import { usePluginManager } from '../components/PluginManagerProvider';

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
export const useOperationResolver = (module: string, resolver: Capabilities.OperationResolver) => {
  const manager = usePluginManager();
  // Wrap single resolver in array as the capability expects an array.
  const resolverArray = useMemo(() => [resolver], [resolver]);

  useEffect(() => {
    manager.capabilities.contribute({
      module,
      interface: Capabilities.OperationResolver,
      implementation: resolverArray,
    });

    return () => manager.capabilities.remove(Capabilities.OperationResolver, resolverArray);
  }, [module, resolverArray]);
};
