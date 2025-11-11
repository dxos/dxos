//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Obj, type Ref } from '@dxos/echo';
import { type Function, getUserFunctionIdInMetadata } from '@dxos/functions';
import { RemoteFunctionExecutionService } from '@dxos/functions-runtime';

import { type ComputeRequirements } from '../types';

// TODO(wittjosiah): Reconcile with getInvocationUrl.
export const resolveFunctionPath = async (fnRef?: Ref.Ref<Function.Function>): Promise<{ path: string }> => {
  const fn = await fnRef?.load();
  if (!fn) {
    throw new Error(`Function loading failed: ${fnRef?.dxn.toString()}`);
  }

  const id = getUserFunctionIdInMetadata(Obj.getMeta(fn));
  if (!id) {
    throw new Error(`Function not resolved: ${fnRef?.dxn.toString()}`);
  }

  return { path: `/${id}` };
};

export const executeFunction = (
  path: string,
  input: any,
  outputSchema: Schema.Schema.AnyNoContext,
): Effect.Effect<any, any, ComputeRequirements> => {
  return Effect.gen(function* () {
    const functionCallService = yield* RemoteFunctionExecutionService;
    const result = yield* functionCallService.callFunction(path, input).pipe(Effect.catchAll((e) => Effect.succeed(e)));
    return yield* Schema.decodeUnknown(outputSchema)(result);
  });
};
