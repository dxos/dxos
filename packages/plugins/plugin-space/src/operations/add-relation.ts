// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Database, Relation } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.AddRelation> = SpaceOperation.AddRelation.pipe(
  Operation.withHandler((input) =>
    Effect.sync(() => {
      const db = input.db as Database.Database;
      const relation = db.add(
        Relation.make(input.schema, {
          [Relation.Source]: input.source,
          [Relation.Target]: input.target,
          ...input.fields,
        }),
      );
      return { relation };
    }),
  ),
);
export default handler;
