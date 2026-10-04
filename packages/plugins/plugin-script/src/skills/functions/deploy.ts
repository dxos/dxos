//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

import { getUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { ConfigService } from '@dxos/config';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { EdgeHttpClientService } from '@dxos/edge-client';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/edge-compute';
import { bundleFunction, initializeBundler } from '@dxos/edge-compute/bundler';
import { Identity } from '@dxos/halo';
import { FunctionRuntimeKind } from '@dxos/protocols';

import { Deploy } from './definitions.ts';
import { FunctionError } from './errors.ts';

export default Deploy.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn }) {
      const loaded = yield* Database.load(fn);
      if (!loaded.source) {
        return yield* Effect.fail(new FunctionError({ message: 'Function has no source script.' }));
      }
      const script = (yield* Database.load(loaded.source)) as Script.Script;

      const db = Obj.getDatabase(loaded);
      if (!db || !script.source?.target?.content) {
        return yield* Effect.fail(new FunctionError({ message: 'Script source or space not available' }));
      }

      yield* Effect.promise(() => initializeBundler({ wasmUrl }));
      const buildResult = yield* Effect.promise(() => bundleFunction({ source: script.source!.target!.content }));
      if ('error' in buildResult) {
        return yield* Effect.fail(buildResult.error ?? new Error('Bundle creation failed'));
      }

      const existingFunctionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));
      const currentVersion = Obj.getMeta(loaded).version;

      const identity = Option.getOrUndefined(yield* Identity.getSnapshot);
      if (!identity) {
        return yield* Effect.fail(new FunctionError({ message: 'Identity not available.' }));
      }

      const functionsService = new FunctionsServiceClient(yield* EdgeHttpClientService);
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
      const config = yield* ConfigService;
      return {
        function: Obj.getURI(loaded),
        functionUrl: edgeFunctionId
          ? `${config.values.runtime?.services?.edge?.url ?? ''}/functions/${edgeFunctionId}`
          : undefined,
      };
    }),
  ),
);
