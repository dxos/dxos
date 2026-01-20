//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/react';
import { type Node } from '@dxos/app-graph';

import { runAction } from '../action';

/**
 * Hook that returns a function to run action Effects.
 * Provides Operation.Service, PluginContextService, and captured plugin context.
 */
export const useActionRunner = () => {
  const invoker = useOperationInvoker();
  const pluginManager = usePluginManager();

  return useCallback(
    (action: Node.Action, params: Node.InvokeProps = {}) =>
      runAction(invoker, pluginManager.capabilities, action, params),
    [invoker, pluginManager.capabilities],
  );
};
