//
// Copyright 2023 DXOS.org
//

import { formatISO9075 } from 'date-fns';

import { debounce } from '@dxos/async';
import { Subscription } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Booking, Ticket, Trip } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { Amadeus, createFlightQuery } from './data';
import { Bot } from '../bot';
import { getKey } from '../util';

// TODO(burdon): Standardize ENV vars.
export const COM_AMADEUS_CLIENT_ID = 'COM_AMADEUS_CLIENT_ID';
export const COM_AMADEUS_CLIENT_SECRET = 'COM_AMADEUS_CLIENT_SECRET';

export class TravelBot extends Bot {
  private _amadeus?: Amadeus;
  private _subscription?: Subscription;

  override async onInit() {
    this._amadeus = new Amadeus({
      clientId: process.env[COM_AMADEUS_CLIENT_ID] ?? getKey(this.config, 'com.amadeus.client_id')!,
      clientSecret: process.env[COM_AMADEUS_CLIENT_SECRET] ?? getKey(this.config, 'com.amadeus.client_secret')!,
    });
  }

  // TODO(burdon): Tune search:
  //  - Direct only.
  //  - Cheapest dates.
  //  - Split trip into different bookings.

  async onStart() {
    const stacks = this.space.db.query(Trip.filter());
    this._subscription = stacks.subscribe(
      // TODO(burdon): Remove debounce once fixed.
      debounce(async ({ objects: trips }) => {
        log.info('updated', { trips: trips.length });
        for (const trip of trips) {
          // TODO(burdon): Don't reprocess.
          if (trip.bookings.length) {
            log.info('skipped');
            return;
          }

          await this.updateTrip(trip);
        }
      }),
    );
  }

  override async onStop() {
    this._subscription?.();
  }

  // TODO(burdon): Factor out.
  async updateTrip(trip: Trip) {
    const destinations = trip.destinations.slice(1);
    const offers = await this._amadeus!.flights(
      createFlightQuery({
        currencyCode: 'USD',
        originDestinations: destinations.map((destination, i) => {
          const previous = trip.destinations[i];
          invariant(previous.address?.cityCode);
          invariant(destination.address?.cityCode);

          return {
            id: String(i + 1),
            originLocationCode: previous.address.cityCode,
            destinationLocationCode: destination.address.cityCode,
            departureDateTimeRange: {
              // TODO(burdon): Range?
              date: formatISO9075(new Date(destination.dateStart!), { representation: 'date' }),
            },
          };
        }),

        searchCriteria: {
          // TODO(burdon): Lower limit with direct/carrier constraints.
          maxFlightOffers: 8,
          flightFilters: {
            cabinRestrictions: trip.profile?.cabin
              ? [
                  {
                    cabin: trip.profile.cabin,
                    originDestinationIds: destinations.map((_, i) => String(i + 1)),
                  },
                ]
              : [],
            carrierRestrictions: {
              // TODO(burdon): Echo array coerced to array of objects.
              // https://www.iata.org/en/about/members/airline-list
              includedCarrierCodes: trip.profile?.carriers?.map((carrier) => String(carrier)),
            },
          },
        },
      }),
    );

    // Each offer represents a potential booking.
    offers.forEach((offer) => {
      // TODO(burdon): Filter offers (e.g., all itineraries are direct). By duration.
      // TODO(burdon): Upgrade JSON to object.
      const ticket: Ticket = {
        source: {
          resolver: offer.source,
          guid: offer.id,
        },

        itineraries: offer.itineraries.map((itinerary) => ({
          segments: itinerary.segments.map((segment) => ({
            departure: {
              iataCode: segment.departure.iataCode,
              at: segment.departure.at,
            },
            arrival: {
              iataCode: segment.arrival.iataCode,
              at: segment.arrival.at,
            },
            duration: segment.duration,
            carrier: segment.carrierCode,
            number: segment.number,
          })),
        })),
      };

      // TODO(burdon): Create single QueryResponse object?
      trip.bookings.push(
        new Booking({
          tickets: [ticket],
          transaction: {
            currency: offer.price.currency,
            total: offer.price.total,
          },
        }),
      );
    });
  }
}
