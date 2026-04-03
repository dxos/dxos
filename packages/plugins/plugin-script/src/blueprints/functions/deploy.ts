//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { getUserFunctionIdInMetadata, type Script } from '@dxos/functions';
import { bundleFunction, initializeBundler } from '@dxos/functions-runtime/bundler';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/functions-runtime/edge';
import { Operation } from '@dxos/operation';
import { FunctionRuntimeKind } from '@dxos/protocols';
import { getSpace } from '@dxos/react-client/echo';
import { isNode } from '@dxos/util';

import { Deploy } from './definitions';

export default Deploy.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn }) {
      const loaded = yield* Database.load(fn);
      const client = yield* ClientService;
      if (!loaded.source) {
        return yield* Effect.fail(new Error('Function has no source script.'));
      }
      const script = (yield* Database.load(loaded.source)) as Script.Script;

      const space = getSpace(loaded);
      if (!space || !script.source?.target?.content) {
        return yield* Effect.fail(new Error('Script source or space not available'));
      }

      if (!isNode()) {
        const { default: wasmUrl } = yield* Effect.promise(() => import('esbuild-wasm/esbuild.wasm?url'));
        yield* Effect.promise(() => initializeBundler({ wasmUrl }));
      }
      const buildResult = yield* Effect.promise(() => bundleFunction({ source: script.source!.target!.content }));
      if ('error' in buildResult) {
        return yield* Effect.fail(buildResult.error ?? new Error('Bundle creation failed'));
      }

      const existingFunctionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));

      const functionsService = FunctionsServiceClient.fromClient(client);
      const newFunction = yield* Effect.promise(() =>
        functionsService.deploy(Context.default(), {
          ownerPublicKey: space.key,
          version: loaded.version ? incrementSemverPatch(loaded.version) : '0.0.1',
          functionId: existingFunctionId,
          entryPoint: buildResult.entryPoint,
          assets: buildResult.assets,
          runtime: FunctionRuntimeKind.enums.WORKER_LOADER,
        }),
      );

      Operation.setFrom(loaded, newFunction);

      Obj.change(script, (draft) => {
        draft.changed = false;
      });

      const edgeFunctionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));
      return {
        function: Obj.getDXN(loaded).toString(),
        functionUrl: edgeFunctionId
          ? `${client.config.values.runtime?.services?.edge?.url ?? ''}/functions/${edgeFunctionId}`
          : undefined,
      };
    }),
  ),
);
