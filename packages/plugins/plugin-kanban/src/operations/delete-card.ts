// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { DeleteCard } from './definitions';

const handler: Operation.WithHandler<typeof DeleteCard> = DeleteCard.pipe(
  Operation.withHandler(({ card }) =>
    Effect.sync(() => {
      const db = Obj.getDatabase(card);
      invariant(db);
      db.remove(card);

      return { card };
    }),
  ),
);

export default handler;
