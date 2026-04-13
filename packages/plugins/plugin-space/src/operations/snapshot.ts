// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Query } from '@dxos/echo';
import { EchoDatabaseImpl, Serializer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Snapshot> = SpaceOperation.Snapshot.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      const db = input.db as any;
      invariant(db instanceof EchoDatabaseImpl, 'Database must be an instance of EchoDatabaseImpl');
      const backup = await new Serializer().export(db, input.query && Query.fromAst(input.query));
      return {
        snapshot: new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      };
    }),
  ),
);
export default handler;
