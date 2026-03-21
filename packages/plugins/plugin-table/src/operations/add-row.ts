// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { getTypenameFromQuery } from '@dxos/schema';

import { AddRow } from './definitions';

export default AddRow.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ view, data }) {
      const db = Obj.getDatabase(view);
      invariant(db);
      const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
      invariant(typename);
      const schema = yield* Effect.promise(() => db.schemaRegistry.query({ typename }).firstOrUndefined());
      invariant(schema);
      const object = Obj.make(schema, data);
      yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });
    }),
  ),
);
