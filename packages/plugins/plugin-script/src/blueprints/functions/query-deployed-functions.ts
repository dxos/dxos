//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { Operation } from '@dxos/operation';

import { QueryDeployedFunctions } from './definitions';

export default QueryDeployedFunctions.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const client = yield* ClientService;
      const functionsService = FunctionsServiceClient.fromClient(client);
      const deployed = yield* Effect.promise(() => functionsService.query(Context.default()));
      return {
        functions: deployed.map((fn) => ({
          key: fn.key,
          name: fn.name ?? 'Unnamed function',
          version: fn.version ?? '0.0.0',
          description: fn.description,
          updated: fn.updated,
        })),
      };
    }),
  ),
);
