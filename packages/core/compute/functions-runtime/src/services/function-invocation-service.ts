//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { AiService } from '@dxos/ai';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation, OperationRegistry } from '@dxos/compute';
import { Context as DxosContext } from '@dxos/context';
import { FunctionInvocationService } from '@dxos/functions';
import { log } from '@dxos/log';

import { LocalFunctionExecutionService } from './local-function-execution';
import type { RemoteFunctionExecutionService as RemoteFunctionExecutionServiceType } from './remote-function-execution-service';

type RemoteService = Context.Tag.Service<RemoteFunctionExecutionServiceType>;
const RemoteFunctionExecutionServiceTag: Context.Tag<RemoteFunctionExecutionServiceType, RemoteService> =
  Context.GenericTag('@dxos/functions/RemoteFunctionExecutionService');

/**
 * Layer that provides FunctionInvocationService implementation routing between local and remote execution.
 *
 * Routing rules (in order):
 *   1. If the passed Operation.Definition carries `meta.deployedId`, route to remote.
 *   2. Otherwise look up the operation by `meta.key` in the per-space registry — if a
 *      `PersistentOperation` record exists with a `deployedId` (set when a function bundle
 *      is uploaded to the space's FunctionsRegistry), route to remote.
 *   3. Otherwise execute locally.
 *
 * Step 2 is what lets operations defined statically in plugins (e.g. `ImapSync`) get
 * remote-dispatched without baking deployedId into their definitions.
 */
export const FunctionInvocationServiceLayer = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const localExecutionService = yield* LocalFunctionExecutionService;
    const remoteExecutionService = yield* RemoteFunctionExecutionServiceTag;
    const operationRegistry = yield* OperationRegistry.Service;

    return {
      invokeFunction: <I, O>(functionDef: Operation.Definition<I, O, any>, input: I): Effect.Effect<O> =>
        Effect.gen(function* () {
          if (functionDef.meta?.deployedId) {
            log('FunctionInvocationService: routing to remote via static deployedId', {
              key: functionDef.meta.key,
              deployedId: functionDef.meta.deployedId,
            });
            return yield* remoteExecutionService.callFunction<I, O>(
              DxosContext.default(),
              functionDef.meta.deployedId,
              input,
            );
          }

          const key = functionDef.meta?.key;
          if (key) {
            const resolved = yield* operationRegistry.resolve(key);
            if (Option.isSome(resolved) && resolved.value.meta?.deployedId) {
              log('FunctionInvocationService: routing to remote via registry lookup', {
                key,
                deployedId: resolved.value.meta.deployedId,
              });
              return yield* remoteExecutionService.callFunction<I, O>(
                DxosContext.default(),
                resolved.value.meta.deployedId,
                input,
              );
            }
          }

          log('FunctionInvocationService: executing locally', { key });
          return yield* localExecutionService.invokeFunction(functionDef, input);
        }),

      resolveFunction: (key: string) =>
        Effect.gen(function* () {
          return yield* localExecutionService.resolveFunction(key);
        }),
    } satisfies Context.Tag.Service<FunctionInvocationService>;
  }),
);

/**
 * Initializes FunctionInvocationServiceLayer with a loopback executor to run functions locally.
 */
export const FunctionInvocationServiceLayerWithLocalLoopbackExecutor = Layer.effect(
  FunctionInvocationService,
  Effect.gen(function* () {
    const functionInvocationService: Context.Tag.Service<FunctionInvocationService> =
      yield* FunctionInvocationService.pipe(
        Effect.provide(
          FunctionInvocationServiceLayer.pipe(
            Layer.provide(LocalFunctionExecutionService.layerLive),
            Layer.provide(
              Layer.succeed(FunctionInvocationService, {
                invokeFunction: (...args) => functionInvocationService.invokeFunction(...args),
                resolveFunction: (...args) => functionInvocationService.resolveFunction(...args),
              }),
            ),
          ),
        ),
      );

    return functionInvocationService;
  }),
);
