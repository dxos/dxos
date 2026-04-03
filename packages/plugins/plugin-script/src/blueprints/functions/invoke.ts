//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { Database } from '@dxos/echo';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { Operation } from '@dxos/operation';
import { getSpace } from '@dxos/react-client/echo';

import { Invoke } from './definitions';

export default Invoke.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, payload }) {
      const loaded = yield* Database.load(fn);
      const client = yield* ClientService;

      const space = getSpace(loaded);
      if (!space) {
        return yield* Effect.fail(new Error('Function is not in a space.'));
      }

      const functionsService = FunctionsServiceClient.fromClient(client);
      const result = yield* Effect.promise(() =>
        functionsService.invoke(Context.default(), loaded, payload ?? {}, { spaceId: space.id }),
      );

      return { response: result };
    }),
  ),
);
