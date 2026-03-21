// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Database, Relation } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

export default SpaceOperation.AddRelation.pipe(
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
