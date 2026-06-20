//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { Support, SupportOperation } from '../types';

const handler: Operation.WithHandler<typeof SupportOperation.CreateTicket> = SupportOperation.CreateTicket.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ title, body }) {
      return yield* Database.add(Support.make({ title, body }));
    }),
  ),
);

export default handler;
