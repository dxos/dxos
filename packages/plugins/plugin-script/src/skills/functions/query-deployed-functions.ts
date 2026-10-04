//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { EdgeHttpClientService } from '@dxos/edge-client';
import { FunctionsServiceClient } from '@dxos/edge-compute';

import { QueryDeployedFunctions } from './definitions.ts';

export default QueryDeployedFunctions.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const functionsService = new FunctionsServiceClient(yield* EdgeHttpClientService);
      const deployed = yield* Effect.promise(() => functionsService.query(Context.default()));
      return {
        functions: deployed.map((fn) => {
          const meta = Obj.getMeta(fn);
          return {
            key: meta.key,
            name: fn.name ?? 'Unnamed function',
            version: meta.version ?? '0.0.0',
            description: fn.description,
            updated: fn.updated,
          };
        }),
      };
    }),
  ),
);
