//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type InvocationServices, type FunctionDefinition } from '../handler';

import { type ComputeEventLogger, type TracingService } from '.';

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
