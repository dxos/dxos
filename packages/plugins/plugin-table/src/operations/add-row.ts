// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';
import { getTypenameFromQuery } from '@dxos/schema';

import { TableOperation } from '../types';

const handler: Operation.WithHandler<typeof TableOperation.AddRow> = TableOperation.AddRow.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ view, data }) {
      const db = Obj.getDatabase(view);
      invariant(db);
      const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
      invariant(typename);
      const schema = yield* Effect.promise(() =>
        Promise.resolve(db.graph.registry.types.find((t) => Type.getTypename(t) === typename)),
      );
      invariant(schema);
      const object = Obj.make(Type.assertObject(schema), data);
      yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });
    }),
  ),
);

export default handler;
