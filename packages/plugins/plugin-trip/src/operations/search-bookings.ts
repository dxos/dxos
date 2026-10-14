//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { BookingOperation, BookingSearch, TripCapabilities } from '#types';

import { BookingSearchError } from './errors.ts';

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
      const offers = yield* Effect.tryPromise({
        try: async () => [...(await service.search(query))],
        catch: (error) => (BookingSearch.isFailure(error) ? error : BookingSearchError.wrap()(error)),
      });
      return { offers };
    }),
  ),
);

export default handler;
