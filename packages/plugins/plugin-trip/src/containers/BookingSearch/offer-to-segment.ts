//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';

import { type BookingSearch, type Booking, type Place, type Segment } from '#types';

/** First leg of an offer. */
const firstSlice = (offer: BookingSearch.FlightOffer): BookingSearch.FlightSliceFields | undefined =>
  offer.slices.at(0);

/** Last leg of an offer (same as first for single-leg offers). */
const lastSlice = (offer: BookingSearch.FlightOffer): BookingSearch.FlightSliceFields | undefined =>
  offer.slices.at(-1);

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
  const number =
    first?.marketingCarrier && first?.flightNumber
      ? `${first.marketingCarrier}${first.flightNumber}`
      : first?.flightNumber;
  return {
    _tag: 'flight',
    provider: { name: offer.carrier.name },
    number,
    origin: toPlace(first?.origin),
    destination: toPlace(last?.destination),
    departAt: first?.departAt,
    arriveAt: last?.arriveAt,
    serviceClass: offer.cabinClass,
  };
};

/** Builds `Booking` make-props from an offer (search-only — no real order). */
export const offerToBookingProps = (offer: BookingSearch.FlightOffer): Obj.MakeProps<typeof Booking.Booking> => ({
  provider: { name: offer.carrier.name },
  currency: offer.currency,
  totalPrice: offer.totalAmount,
  source: 'import',
  rawPayload: JSON.stringify(offer),
});
