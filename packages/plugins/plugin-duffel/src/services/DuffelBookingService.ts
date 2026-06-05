//
// Copyright 2026 DXOS.org
//

import { BookingSearch } from '@dxos/plugin-trip/types';

import { offerRequestBody, parseOffers } from './duffel-mapping';
import { createOfferRequest } from './DuffelClient';

export const DUFFEL_SERVICE_ID = 'duffel';

/**
 * Builds the BookingService implementation. Takes a `getApiKey` accessor (the
 * capability module wires it to the live settings atom) so the current key is
 * read at search time and the factory stays unit-testable.
 */
export const makeDuffelBookingService = (getApiKey: () => string | undefined): BookingSearch.BookingService => ({
  id: DUFFEL_SERVICE_ID,
  label: 'Duffel',
  kinds: ['flight'],
  search: async (query) => {
    if (query._tag !== 'flight') {
      return [];
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new BookingSearch.MissingApiKeyError(DUFFEL_SERVICE_ID);
    }
    const response = await createOfferRequest(apiKey, offerRequestBody(query));
    return parseOffers(response);
  },
});
