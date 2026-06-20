//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { type Support, SupportOperation } from '../types';

const handler: Operation.WithHandler<typeof SupportOperation.MarkInProgress> = SupportOperation.MarkInProgress.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ ticket }) {
      const obj = (yield* Database.load(ticket)) as Support.Ticket;
      Obj.update(obj, (obj) => {
        const mutable = obj as Obj.Mutable<typeof obj>;
        mutable.status = 'in_progress';
      });
      return obj;
    }),
  ),
);

export default handler;
