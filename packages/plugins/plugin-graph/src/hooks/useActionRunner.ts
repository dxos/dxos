//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import { runAction } from '../action.ts';

/**
 * Hook that returns a function to run action Effects.
 * Provides Operation.Service, PluginContextService, and captured plugin context.
 */
export const useActionRunner = () => {
  const invoker = Hooks.useOperationInvoker();
  const pluginManager = PluginManagerProvider.usePluginManager();

  return useCallback(
    (action: AppGraphNode.Action, params: AppGraphNode.InvokeProps = {}) =>
      runAction(invoker, pluginManager.capabilities, action, params),
    [invoker, pluginManager.capabilities],
  );
};
