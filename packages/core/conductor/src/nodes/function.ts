//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { Obj, type Ref } from '@dxos/echo';
import { getUserFunctionUrlInMetadata, type FunctionType } from '@dxos/functions';

import { FunctionCallService } from '../services';
import { type ComputeRequirements } from '../types';

export const resolveFunctionPath = async (fnRef?: Ref.Ref<FunctionType>): Promise<{ path: string }> => {
  const fn = await fnRef?.load();
  if (!fn) {
    throw new Error(`Function loading failed: ${fnRef?.dxn.toString()}`);
  }

  const path = getUserFunctionUrlInMetadata(Obj.getMeta(fn));
  if (!path) {
    throw new Error(`Function not resolved: ${fnRef?.dxn.toString()}`);
  }

  return { path };
};

export const executeFunction = (
  path: string,
  input: any,
  outputSchema: Schema.Schema.AnyNoContext,
): Effect.Effect<any, any, ComputeRequirements> => {
  return Effect.gen(function* () {
    const functionCallService = yield* FunctionCallService;

    const result = yield* Effect.tryPromise({
      try: () => functionCallService.callFunction(path, input),
      catch: (e) => e,
    });

    return yield* Schema.decodeUnknown(outputSchema)(result);
  });
};
