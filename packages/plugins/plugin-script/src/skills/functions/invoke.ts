//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { EdgeHttpClientService } from '@dxos/edge-client';
import { FunctionsServiceClient } from '@dxos/edge-compute';

import { Invoke } from './definitions.ts';
import { FunctionError } from './errors.ts';

export default Invoke.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, payload }) {
      const loaded = yield* Database.load(fn);

      const spaceId = Obj.getDatabase(loaded)?.spaceId;
      if (!spaceId) {
        return yield* Effect.fail(new FunctionError({ message: 'Function is not in a space.' }));
      }

      const functionsService = new FunctionsServiceClient(yield* EdgeHttpClientService);
      const result = yield* Effect.promise(() =>
        functionsService.invoke(Context.default(), loaded, payload ?? {}, { spaceId }),
      );

      return { response: result };
    }),
  ),
);
