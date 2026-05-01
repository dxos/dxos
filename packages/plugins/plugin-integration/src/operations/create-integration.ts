//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { Integration } from '../types';
import { CreateIntegration } from './definitions';

const handler: Operation.WithHandler<typeof CreateIntegration> = CreateIntegration.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ accessToken, name }) {
      // TODO(wittjosiah): the operation should just depend on `Database.Service`
      //   once the OperationInvoker has a `databaseResolver`. For now, derive
      //   the db from the input ref's target and provide `Database.layer(db)`.
      const accessTokenObj = accessToken.target;
      const db = accessTokenObj ? Obj.getDatabase(accessTokenObj) : undefined;
      if (!db) {
        return yield* Effect.fail(new Error('No database for accessToken ref'));
      }

      return yield* Effect.gen(function* () {
        const integration = Integration.make({
          name,
          accessToken,
          targets: [],
        });
        return yield* Database.add(integration);
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  ),
);

export default handler;
