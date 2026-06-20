// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { KanbanOperation } from '../types';

const handler: Operation.WithHandler<typeof KanbanOperation.RestoreCard> = KanbanOperation.RestoreCard.pipe(
  Operation.withHandler(({ card }) =>
    Effect.sync(() => {
      const db = Obj.getDatabase(card);
      invariant(db);
      db.add(card);
    }),
  ),
);

export default handler;
