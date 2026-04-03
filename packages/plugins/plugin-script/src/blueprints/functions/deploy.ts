//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { Database, Obj, Query, Ref } from '@dxos/echo';
import { getUserFunctionIdInMetadata } from '@dxos/functions';
import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/functions-runtime/edge';
import { Operation } from '@dxos/operation';
import { FunctionRuntimeKind } from '@dxos/protocols';
import { getSpace } from '@dxos/react-client/echo';

import { Deploy } from './definitions';

export default Deploy.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script }) {
      const loaded = yield* Database.load(script);
      const client = yield* ClientService;

      const space = getSpace(loaded);
      if (!space || !loaded.source?.target?.content) {
        return yield* Effect.fail(new Error('Script source or space not available'));
      }

      const buildResult = yield* Effect.promise(() =>
        bundleFunction({ source: loaded.source!.target!.content }),
      );
      if ('error' in buildResult) {
        return yield* Effect.fail(buildResult.error ?? new Error('Bundle creation failed'));
      }

      const existingFns = yield* Effect.promise(() =>
        space.db.query(Query.type(Operation.PersistentOperation, { source: Ref.make(loaded) })).run(),
      );
      const existingFn = existingFns[0];
      const existingFunctionId = existingFn ? getUserFunctionIdInMetadata(Obj.getMeta(existingFn)) : undefined;

      const functionsService = FunctionsServiceClient.fromClient(client);
      const newFunction = yield* Effect.promise(() =>
        functionsService.deploy(Context.default(), {
          ownerPublicKey: space.key,
          version: existingFn ? incrementSemverPatch(existingFn.version) : '0.0.1',
          functionId: existingFunctionId,
          entryPoint: buildResult.entryPoint,
          assets: buildResult.assets,
          runtime: FunctionRuntimeKind.enums.WORKER_LOADER,
        }),
      );

      if (existingFn) {
        Operation.setFrom(existingFn, newFunction);
      } else {
        Obj.change(newFunction, (obj) => {
          obj.source = Ref.make(loaded);
        });
        space.db.add(newFunction);
      }

      Obj.change(loaded, (obj) => {
        obj.changed = false;
      });

      const functionId = getUserFunctionIdInMetadata(Obj.getMeta(existingFn ?? newFunction));
      return {
        functionId: functionId ?? '',
        functionUrl: functionId
          ? `${client.config.values.runtime?.services?.edge?.url ?? ''}/functions/${functionId}`
          : undefined,
      };
    }),
  ),
);
