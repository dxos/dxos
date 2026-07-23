//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

import { ClientService } from '@dxos/client';
import { Operation, Script } from '@dxos/compute';
import { getUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/edge-compute';
import { bundleFunction, initializeBundler } from '@dxos/edge-compute/bundler';
import { FunctionRuntimeKind } from '@dxos/protocols';

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

      const db = Obj.getDatabase(loaded);
      if (!db || !script.source?.target?.content) {
        return yield* Effect.fail(new Error('Script source or space not available'));
      }

      yield* Effect.promise(() => initializeBundler({ wasmUrl }));
      const buildResult = yield* Effect.promise(() => bundleFunction({ source: script.source!.target!.content }));
      if ('error' in buildResult) {
        return yield* Effect.fail(buildResult.error ?? new Error('Bundle creation failed'));
      }

      const existingFunctionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));
      const currentVersion = Obj.getMeta(loaded).version;

      const identity = client.halo.identity.get();
      if (!identity) {
        return yield* Effect.fail(new Error('Identity not available.'));
      }

      const functionsService = FunctionsServiceClient.fromClient(client);
      const newFunction = yield* Effect.promise(() =>
        functionsService.deploy(Context.default(), {
          ownerUri: identity.did,
          version: currentVersion ? incrementSemverPatch(currentVersion) : '0.0.1',
          functionId: existingFunctionId,
          entryPoint: buildResult.entryPoint,
          assets: buildResult.assets,
          runtime: FunctionRuntimeKind.enums.WORKER_LOADER,
        }),
      );

      Operation.setFrom(loaded, newFunction);

      Obj.update(script, (script) => {
        script.changed = false;
      });

      const edgeFunctionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));
      return {
        function: Obj.getURI(loaded),
        functionUrl: edgeFunctionId
          ? `${client.config.values.runtime?.services?.edge?.url ?? ''}/functions/${edgeFunctionId}`
          : undefined,
      };
    }),
  ),
);
