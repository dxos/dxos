//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Sheet, SheetOperation } from '#types';

const handler: Operation.WithHandler<typeof SheetOperation.Create> = SheetOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, rows, columns }) {
      const object = yield* Database.add(Sheet.make({ name, rows, columns }));
      yield* ContainerModel.add({ object }).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.void));
      yield* Database.flush();
      return { id: Obj.getURI(object) };
    }),
  ),
);

export default handler;
