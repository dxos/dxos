//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Node } from '@dxos/app-graph';
import { Capability } from '@dxos/app-framework';
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
): Promise<void> => {
  const effect = action.data(params);

  // Build final effect with all required layers.
  let finalEffect = effect.pipe(
    // Provide Operation.Service from the invoker.
    Effect.provideService(Operation.Service, {
      invoke: invoker.invoke,
      schedule: (op, ...args) =>
        Effect.asVoid(invoker.invoke(op, args[0] as never)).pipe(Effect.catchAll(() => Effect.void)),
      invokePromise: invoker.invokePromise,
      invokeSync: invoker.invokeSync,
    }),
    // Provide PluginContextService.
    Effect.provideService(Capability.PluginContextService, pluginContext),
  );

  // Provide captured action context if available (contains plugin-specific services).
  if (action._actionContext) {
    finalEffect = finalEffect.pipe(Effect.provide(action._actionContext));
  }

  await runAndForwardErrors(finalEffect);
};
