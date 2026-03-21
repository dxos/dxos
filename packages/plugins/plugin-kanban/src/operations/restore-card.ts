// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { RestoreCard } from './definitions';

export default RestoreCard.pipe(
  Operation.withHandler(
    ({ card }) =>
      Effect.sync(() => {
        const db = Obj.getDatabase(card);
        invariant(db);
        db.add(card);
      }),
  ),
);
