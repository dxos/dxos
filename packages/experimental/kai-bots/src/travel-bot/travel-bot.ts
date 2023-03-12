//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { formatISO9075 } from 'date-fns';

import { debounce } from '@dxos/async';
import { Subscription } from '@dxos/echo-schema';
import { Ticket, Trip } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { Bot } from '../bot';
import { getKey } from '../util';
import { Amadeus, createFlightQuery } from './data';

// TODO(burdon): Standardize ENV vars.
export const COM_AMADEUS_CLIENT_ID = 'COM_AMADEUS_CLIENT_ID';
export const COM_AMADEUS_CLIENT_SECRET = 'COM_AMADEUS_CLIENT_SECRET';

export class TravelBot extends Bot {
  private _amadeus?: Amadeus;
  private _subscription?: Subscription;

  private _count = 0;

  override async onInit() {
    this._amadeus = new Amadeus({
      clientId: process.env[COM_AMADEUS_CLIENT_ID] ?? getKey(this.config, 'com.amadeus.client_id')!,
      clientSecret: process.env[COM_AMADEUS_CLIENT_SECRET] ?? getKey(this.config, 'com.amadeus.client_secret')!
    });
  }

  async onStart() {
    const stacks = this.space.db.query(Trip.filter());
    this._subscription = stacks.subscribe(
      // TODO(burdon): Remove debounce once fixed.
      debounce(async ({ objects: trips }) => {
        log.info('updated', { objects: trips.length });
        if (this._count++ > 0) {
          log.info('skipped', this._count);
          return;
        }

        for (const trip of trips) {
          // TODO(burdon): Factor out mapping.
          // TODO(burdon): Validation checks.
          const offers = await this._amadeus!.flights(
            createFlightQuery({
              currencyCode: 'USD',
              originDestinations: trip.destinations.slice(1).map((destination, i) => {
                const previous = trip.destinations[i];
                assert(previous.address?.cityCode);
                assert(destination.address?.cityCode);

                return {
                  id: String(i + 1),
                  originLocationCode: previous.address.cityCode,
                  destinationLocationCode: destination.address.cityCode,
                  departureDateTimeRange: {
                    // TODO(burdon): Range?
                    date: formatISO9075(new Date(destination.dateStart!), { representation: 'date' })
                  }
                };
              }),
              searchCriteria: {
                // TODO(burdon): Lower limit with direct/carrier constraints.
                maxFlightOffers: 5,
                // TODO(burdon): From user travel preferences.
                flightFilters: {
                  cabinRestrictions: [
                    {
                      cabin: 'BUSINESS',
                      coverage: 'MOST_SEGMENTS',
                      originDestinationIds: trip.destinations.slice(1).map((_, i) => String(i + 1))
                    }
                  ],
                  carrierRestrictions: {
                    includedCarrierCodes: ['AA', 'AF']
                  }
                }
              }
            })
          );

          // Each offer represents a potential booking.
          offers.forEach((offer) => {
            // TODO(burdon): Filter offers (e.g., all itineraries are direct). By duration.
            // TODO(burdon): Upgrade JSON to object.
            const ticket: Ticket = {
              source: {
                vendor: offer.source,
                guid: offer.id
              },

              itineraries: offer.itineraries.map((itinerary) => ({
                segments: itinerary.segments.map((segment) => ({
                  departure: {
                    iataCode: segment.departure.iataCode,
                    at: segment.departure.at
                  },
                  arrival: {
                    iataCode: segment.arrival.iataCode,
                    at: segment.arrival.at
                  },
                  duration: segment.duration,
                  carrier: segment.carrierCode,
                  number: segment.number
                }))
              }))
            };

            trip.bookings.push({
              tickets: [ticket],
              transaction: {
                currency: offer.price.currency,
                total: offer.price.total
              }
            });
          });
        }
      })
    );
  }

  override async onStop() {
    this._subscription?.();
  }
}
