//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';

/**
 * Run an action with required layers: Operation.Service, Capability.Service, and captured context.
 * @param invoker The operation invoker to use for Operation.Service.
 * @param capabilityManager The capability manager for Capability.Service.
 * @param action The action to execute.
 * @param params Parameters to pass to the action.
 */
export const runAction = async (
  invoker: Operation.OperationService,
  capabilityManager: CapabilityManager.CapabilityManager,
  action: AppGraphNode.Action,
  params: AppGraphNode.InvokeProps = {},
): Promise<void> =>
  EffectEx.runAndForwardErrors(
    action
      .data(params)
      .pipe(
        Effect.provideService(Operation.Service, invoker),
        Effect.provideService(Capability.Service, capabilityManager),
        action._actionContext ? Effect.provide(action._actionContext) : Function.identity,
      ),
  );
