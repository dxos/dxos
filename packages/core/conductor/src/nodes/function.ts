//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { type Ref } from '@dxos/echo-schema';
import { getUserFunctionUrlInMetadata, type FunctionType } from '@dxos/functions/types';
import { getMeta } from '@dxos/live-object';

import { FunctionCallService } from '../services';
import { type ComputeRequirements } from '../types';

export const resolveFunctionPath = async (fnRef?: Ref<FunctionType>): Promise<{ path: string }> => {
  const fn = await fnRef?.load();
  if (!fn) {
    throw new Error(`Function loading failed: ${fnRef?.dxn.toString()}`);
  }

  const path = getUserFunctionUrlInMetadata(getMeta(fn));
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
