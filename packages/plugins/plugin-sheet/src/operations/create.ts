//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { Sheet, SheetOperation } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.Create> = SheetOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, rows, columns }) {
      const object = yield* Database.add(Sheet.make({ name, rows, columns }));
      yield* CollectionModel.add({ object }).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.void));
      yield* Database.flush();
      return { id: Obj.getURI(object) };
    }),
  ),
);

export default handler;
