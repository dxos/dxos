//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type BookingSearch, type Segment } from '@dxos/plugin-trip';

/** Duffel cabin_class values. */
const DuffelCabin = Schema.Literal('economy', 'premium_economy', 'business', 'first');
type DuffelCabin = Schema.Schema.Type<typeof DuffelCabin>;

const CABIN_MAP: Record<Segment.ServiceClass, DuffelCabin> = {
  economy: 'economy',
  premium: 'premium_economy',
  business: 'business',
  first: 'first',
};

export type DuffelOfferRequestBody = {
  data: {
    slices: Array<{ origin: string; destination: string; departure_date: string }>;
    passengers: Array<{ type: 'adult' }>;
    cabin_class?: DuffelCabin;
  };
};

/** Date-only (YYYY-MM-DD) component of an ISO datetime, as Duffel requires. */
const toDateOnly = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

/** Maps a simplified FlightSearchQuery onto a Duffel offer-request body. */
export const offerRequestBody = (query: BookingSearch.FlightSearchQuery): DuffelOfferRequestBody => {
  const slices: DuffelOfferRequestBody['data']['slices'] = [];
  if (query.origin && query.destination && query.departureDate) {
    slices.push({
      origin: query.origin,
      destination: query.destination,
      departure_date: toDateOnly(query.departureDate),
    });
    if (query.returnDate) {
      slices.push({
        origin: query.destination,
        destination: query.origin,
        departure_date: toDateOnly(query.returnDate),
      });
    }
  }
  const count = Math.max(1, query.passengers ?? 1);
  return {
    data: {
      slices,
      passengers: Array.from({ length: count }, () => ({ type: 'adult' as const })),
      cabin_class: query.serviceClass ? CABIN_MAP[query.serviceClass] : undefined,
    },
  };
};

const CABIN_REVERSE: Record<DuffelCabin, Segment.ServiceClass> = {
  economy: 'economy',
  premium_economy: 'premium',
  business: 'business',
  first: 'first',
};

/** Parses an ISO-8601 duration like `PT7H30M` to minutes. */
const parseDurationMinutes = (duration?: string): number | undefined => {
  if (!duration) {
    return undefined;
  }
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  if (!match) {
    return undefined;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
};

// Minimal structural views of the Duffel response (only fields we consume).
type DuffelSegment = {
  origin?: { iata_code?: string; name?: string };
  destination?: { iata_code?: string; name?: string };
  departing_at?: string;
  arriving_at?: string;
  marketing_carrier?: { iata_code?: string };
  marketing_carrier_flight_number?: string;
  duration?: string;
};
type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  owner?: { name?: string; iata_code?: string };
  slices?: Array<{ segments?: DuffelSegment[] }>;
  cabin_class?: DuffelCabin;
};
export type DuffelOffersResponse = { data?: { offers?: DuffelOffer[] } };

const toSlice = (segment: DuffelSegment): BookingSearch.FlightSliceFields => ({
  origin: { code: segment.origin?.iata_code ?? '', name: segment.origin?.name },
  destination: { code: segment.destination?.iata_code ?? '', name: segment.destination?.name },
  departAt: segment.departing_at,
  arriveAt: segment.arriving_at,
  operator: segment.marketing_carrier?.iata_code,
  number: segment.marketing_carrier_flight_number,
  durationMinutes: parseDurationMinutes(segment.duration),
});

/** Maps a Duffel offers response into the transient FlightOffer[] shape. */
export const parseOffers = (response: DuffelOffersResponse): BookingSearch.FlightOffer[] =>
  (response.data?.offers ?? []).map((offer) => ({
    _tag: 'flight' as const,
    id: offer.id,
    provider: 'duffel',
    operator: { name: offer.owner?.name ?? 'Unknown', iataCode: offer.owner?.iata_code },
    totalAmount: Number(offer.total_amount),
    currency: offer.total_currency,
    serviceClass: offer.cabin_class ? CABIN_REVERSE[offer.cabin_class] : undefined,
    slices: (offer.slices ?? []).flatMap((slice) => (slice.segments ?? []).map(toSlice)),
  }));
