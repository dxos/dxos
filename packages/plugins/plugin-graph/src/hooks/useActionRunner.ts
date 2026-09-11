//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import { runAction } from '../action.ts';

/**
 * Hook that returns a function to run action Effects.
 * Provides Operation.Service, PluginContextService, and captured plugin context.
 */
export const useActionRunner = () => {
  const invoker = useOperationInvoker();
  const pluginManager = usePluginManager();

  return useCallback(
    (action: AppGraphNode.Action, params: AppGraphNode.InvokeProps = {}) =>
      runAction(invoker, pluginManager.capabilities, action, params),
    [invoker, pluginManager.capabilities],
  );
};
