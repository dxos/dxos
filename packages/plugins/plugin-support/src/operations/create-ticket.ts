//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import * as Support from '../types/Support';
import * as SupportOperation from '../types/SupportOperation';

const handler: Operation.WithHandler<typeof SupportOperation.CreateTicket> = SupportOperation.CreateTicket.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ title, body }) {
      return yield* Database.add(Support.make({ title, body }));
    }),
  ),
);

export default handler;
