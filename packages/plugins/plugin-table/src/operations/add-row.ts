// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';
import { getTypeURIFromQuery } from '@dxos/schema';

import { TableOperation } from '../types';

const handler: Operation.WithHandler<typeof TableOperation.AddRow> = TableOperation.AddRow.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ view, data }) {
      const db = Obj.getDatabase(view);
      invariant(db);
      const typeUri = view.query ? getTypeURIFromQuery(view.query.ast) : undefined;
      invariant(typeUri);
      // Fan across space (persisted db types) and registry (static plugin types).
      const types = yield* Effect.promise(() =>
        db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run(),
      );
      const schema = types.find((t) => Type.getURI(t) === typeUri);
      invariant(schema);
      const object = Obj.make(Type.assertObject(schema), data);
      yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });
    }),
  ),
);

export default handler;
