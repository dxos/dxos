//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { BookingOperation, TripCapabilities } from '../types';

const handler: Operation.WithHandler<typeof BookingOperation.SearchBookings> = BookingOperation.SearchBookings.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ query, provider }) {
      const services = yield* Capability.getAll(TripCapabilities.BookingService);
      const service = services.find(
        (candidate) => candidate.kinds.includes(query._tag) && (!provider || candidate.id === provider),
      );
      if (!service) {
        return { offers: [] };
      }
      const offers = yield* Effect.promise(async () => [...(await service.search(query))]);
      return { offers };
    }),
  ),
);

export default handler;
