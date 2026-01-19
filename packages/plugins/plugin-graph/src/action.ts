//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { Capability } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { runAndForwardErrors } from '@dxos/effect';
import { Operation, type OperationInvoker } from '@dxos/operation';

/**
 * Run an action with required layers: Operation.Service, PluginContextService, and captured context.
 * @param invoker The operation invoker to use for Operation.Service.
 * @param pluginContext The plugin context for PluginContextService.
 * @param action The action to execute.
 * @param params Parameters to pass to the action.
 */
export const runAction = async (
  invoker: OperationInvoker.OperationInvoker,
  pluginContext: Capability.PluginContext,
  action: Node.Action,
  params: Node.InvokeProps = {},
): Promise<void> =>
  runAndForwardErrors(
    action
      .data(params)
      .pipe(
        Effect.provideService(Operation.Service, invoker),
        Effect.provideService(Capability.PluginContextService, pluginContext),
        action._actionContext ? Effect.provide(action._actionContext) : Function.identity,
      ),
  );
