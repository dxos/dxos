//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type FunctionDefinition, type InvocationServices } from '../sdk';

export class FunctionInvocationService extends Context.Tag('@dxos/functions/FunctionInvocationService')<
  FunctionInvocationService,
  {
    invokeFunction<I, O>(
      functionDef: FunctionDefinition<I, O, any>,
      input: I,
    ): Effect.Effect<O, never, InvocationServices>;
  }
>() {
  static invokeFunction = <I, O>(
    functionDef: FunctionDefinition<I, O, any>,
    input: I,
  ): Effect.Effect<O, never, FunctionInvocationService | InvocationServices> =>
    Effect.serviceFunctionEffect(FunctionInvocationService, (service) => service.invokeFunction)(functionDef, input);
}
