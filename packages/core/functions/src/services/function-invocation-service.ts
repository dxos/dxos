//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Operation } from '@dxos/operation';

import type { FunctionNotFoundError } from '../errors';
import { type InvocationServices } from '../sdk';

export class FunctionInvocationService extends Context.Tag('@dxos/functions/FunctionInvocationService')<
  FunctionInvocationService,
  {
    invokeFunction<I, O>(
      functionDef: Operation.Definition<I, O, any>,
      input: I,
    ): Effect.Effect<O, never, InvocationServices>;

    resolveFunction(key: string): Effect.Effect<Operation.Definition.Any, FunctionNotFoundError>;
  }
>() {
  static layerNotAvailable = Layer.succeed(FunctionInvocationService, {
    invokeFunction: () => Effect.die('FunctionInvocationService is not avaialble.'),
    resolveFunction: () => Effect.die('FunctionInvocationService is not available.'),
  });

  static invokeFunction = <I, O>(
    functionDef: Operation.Definition<I, O, any>,
    input: I,
  ): Effect.Effect<O, never, FunctionInvocationService | InvocationServices> =>
    Effect.serviceFunctionEffect(FunctionInvocationService, (service) => service.invokeFunction)(functionDef, input);

  static resolveFunction = (
    key: string,
  ): Effect.Effect<Operation.Definition.Any, FunctionNotFoundError, FunctionInvocationService> =>
    Effect.serviceFunctionEffect(FunctionInvocationService, (service) => service.resolveFunction)(key);
}
