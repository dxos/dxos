//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Sheet, SheetOperation } from '#types';

const handler: Operation.WithHandler<typeof SheetOperation.Create> = SheetOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, rows, columns }) {
      const { db } = yield* Database.Service;
      // plugin-space files it: on EDGE this plugin's bundle has no default-parent rule.
      const { id } = yield* Operation.invoke(
        SpaceOperation.AddObject,
        { object: Sheet.make({ name, rows, columns }) },
        { spaceId: db.spaceId },
      );
      yield* Database.flush();
      return { id };
    }),
  ),
);

export default handler;
