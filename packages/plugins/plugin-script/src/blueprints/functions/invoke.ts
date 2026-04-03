//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { Database, Query, Ref } from '@dxos/echo';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { Operation } from '@dxos/operation';
import { getSpace } from '@dxos/react-client/echo';

import { Invoke } from './definitions';

export default Invoke.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script, payload }) {
      const loaded = yield* Database.load(script);
      const client = yield* ClientService;

      const space = getSpace(loaded);
      if (!space) {
        return yield* Effect.fail(new Error('Script is not in a space.'));
      }

      const existingFns = yield* Effect.promise(() =>
        space.db.query(Query.type(Operation.PersistentOperation, { source: Ref.make(loaded) })).run(),
      );
      const fn = existingFns[0];
      if (!fn) {
        return yield* Effect.fail(new Error('Script is not deployed. Deploy it first.'));
      }

      const functionsService = FunctionsServiceClient.fromClient(client);
      const result = yield* Effect.promise(() =>
        functionsService.invoke(Context.default(), fn, payload ?? {}, { spaceId: space.id }),
      );

      return { response: result };
    }),
  ),
);
