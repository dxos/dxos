//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type FunctionDefinition } from '../handler';

import { type ComputeEventLogger, type TracingService } from '.';

/**
 * Services that are provided at the function call site.
 */
export type InvocationServices = TracingService;

export class FunctionInvocationService extends Context.Tag('@dxos/functions/FunctionInvocationService')<
  FunctionInvocationService,
  {
    invokeFunction<I, O>(functionDef: FunctionDefinition<I, O>, input: I): Effect.Effect<O, never, InvocationServices>;
  }
>() {
  static invokeFunction = <I, O>(
    functionDef: FunctionDefinition<I, O>,
    input: I,
  ): Effect.Effect<O, never, FunctionInvocationService | InvocationServices> =>
    Effect.serviceFunctionEffect(FunctionInvocationService, (service) => service.invokeFunction)(functionDef, input);
}
