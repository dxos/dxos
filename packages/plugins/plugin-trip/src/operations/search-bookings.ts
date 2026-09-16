//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { messageOf } from '@dxos/errors';

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
      // `tryPromise` routes a `search` rejection (e.g. MissingApiKeyError) to the operation's
      // failure channel; the `catch` preserves the original Error so callers can match by name.
      const offers = yield* Effect.tryPromise({
        try: async () => [...(await service.search(query))],
        catch: (error) =>
          error instanceof BookingSearch.MissingApiKeyError
            ? error
            : new BookingSearchError({ message: messageOf(error), cause: error }),
      });
      return { offers };
    }),
  ),
);

export default handler;
