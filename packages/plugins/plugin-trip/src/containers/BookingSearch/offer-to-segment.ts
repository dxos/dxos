//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';

import { type Booking, type BookingSearch, type Place, type Segment } from '#types';

/** First leg of an offer. */
const firstSlice = (offer: BookingSearch.FlightOffer): BookingSearch.FlightSliceFields | undefined =>
  offer.slices.at(0);

/** Last leg of an offer (same as first for single-leg offers). */
const lastSlice = (offer: BookingSearch.FlightOffer): BookingSearch.FlightSliceFields | undefined =>
  offer.slices.at(-1);

// Offer slices only carry code + name; city/country/geo are intentionally narrowed away
// (selecting an offer overwrites the segment's place with the carrier-provided values).
const toPlace = (place?: { code: string; name?: string }): Place.Place | undefined =>
  place ? { code: place.code, name: place.name } : undefined;

/**
 * Builds the `flight` `Segment.details` patch from an offer. Uses the first
 * leg's origin/departure and the last leg's destination/arrival so a multi-leg
 * offer collapses into a single segment route.
 */
export const offerToFlightDetails = (offer: BookingSearch.FlightOffer): Segment.FlightDetails => {
  const first = firstSlice(offer);
  const last = lastSlice(offer);
  const number = first?.operator && first?.number ? `${first.operator}${first.number}` : first?.number;
  return {
    _tag: 'flight',
    provider: { name: offer.operator.name },
    number,
    origin: toPlace(first?.origin),
    destination: toPlace(last?.destination),
    departAt: first?.departAt,
    arriveAt: last?.arriveAt,
    serviceClass: offer.serviceClass,
  };
};

/** Builds `Booking` make-props from an offer (search-only — no real order). */
export const offerToBookingProps = (offer: BookingSearch.FlightOffer): Obj.MakeProps<typeof Booking.Booking> => ({
  provider: { name: offer.operator.name },
  currency: offer.currency,
  totalPrice: offer.totalAmount,
  source: 'import',
  rawPayload: JSON.stringify(offer),
});
