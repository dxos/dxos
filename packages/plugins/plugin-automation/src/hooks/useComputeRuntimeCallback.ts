//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { type FunctionDefinition, FunctionInvocationService } from '@dxos/functions';
import { InvocationTracer, TracingServiceExt } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import type { Space } from '@dxos/react-client/echo';

import { AutomationCapabilities } from '../capabilities';

/**
 * Create an effectful function that has access to compute services
 */
// TODO(burdon): Factor out (figure out cross-plugin capabilities dependencies).
export const useComputeRuntimeCallback = <T>(
  space: Space | undefined,
  fn: () => Effect.Effect<T, any, AutomationCapabilities.ComputeServices>,
  deps?: React.DependencyList,
): (() => Promise<T>) => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = space !== undefined ? computeRuntime.getRuntime(space.id) : undefined;

  return useCallback(() => {
    if (!runtime) {
      throw new TypeError('Space not provided to useComputeRuntimeCallback');
    }

    return runtime.runPromise(fn());
  }, [runtime, ...(deps ?? [])]);
};

// TODO(wittjosiah): Function invoking should automatically be traced (DX-647).
export const invokeFunctionWithTracing = <I, O>(functionDef: FunctionDefinition<I, O>, inputData: I) =>
  Effect.gen(function* () {
    const tracer = yield* InvocationTracer;
    const trace = yield* tracer.traceInvocationStart({
      target: undefined,
      payload: {
        data: {},
      },
    });

    // Invoke the function.
    const result = yield* FunctionInvocationService.invokeFunction(functionDef, inputData).pipe(
      Effect.provide(TracingServiceExt.layerQueue(trace.invocationTraceQueue)),
      Effect.exit,
    );

    if (Exit.isFailure(result)) {
      const error = Cause.prettyErrors(result.cause)[0];
      log.error(error.message, error.cause ?? error.stack);
    }

    yield* tracer.traceInvocationEnd({
      trace,
      // TODO(dmaretskyi): Might miss errors.
      exception: Exit.isFailure(result) ? Cause.prettyErrors(result.cause)[0] : undefined,
    });

    return result;
  });
