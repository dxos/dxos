//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { Capability, type CapabilityManager } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { runAndForwardErrors } from '@dxos/effect';
import { Operation, type OperationInvoker } from '@dxos/operation';

/**
 * Run an action with required layers: Operation.Service, Capability.Service, and captured context.
 * @param invoker The operation invoker to use for Operation.Service.
 * @param capabilityManager The capability manager for Capability.Service.
 * @param action The action to execute.
 * @param params Parameters to pass to the action.
 */
export const runAction = async (
  invoker: OperationInvoker.OperationInvoker,
  capabilityManager: CapabilityManager.CapabilityManager,
  action: Node.Action,
  params: Node.InvokeProps = {},
): Promise<void> =>
  runAndForwardErrors(
    action
      .data(params)
      .pipe(
        Effect.provideService(Operation.Service, invoker),
        Effect.provideService(Capability.Service, capabilityManager),
        action._actionContext ? Effect.provide(action._actionContext) : Function.identity,
      ),
  );
