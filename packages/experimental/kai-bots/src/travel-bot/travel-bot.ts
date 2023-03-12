//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { formatISO9075 } from 'date-fns';

import { debounce } from '@dxos/async';
import { Subscription } from '@dxos/echo-schema';
import { Trip } from '@dxos/kai-types';
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
              originDestinations: trip.segments.slice(1).map((segment, i) => {
                const previous = trip.segments[i];
                assert(previous.destination?.code);
                assert(segment.destination?.code);

                return {
                  id: String(i + 1),
                  originLocationCode: previous.destination.code,
                  destinationLocationCode: segment.destination.code,
                  departureDateTimeRange: {
                    // TODO(burdon): Range?
                    date: formatISO9075(new Date(segment.dateStart!), { representation: 'date' })
                  }
                };
              }),
              searchCriteria: {
                maxFlightOffers: 5, // TODO(burdon): Lower limit with direct/carrier constraints.
                flightFilters: {
                  carrierRestrictions: {
                    includedCarrierCodes: ['AA', 'AF']
                  }
                }
              }
            })
          );

          // TODO(burdon): Need tool to view JSON result as updated document.
          // TODO(burdon): Auto-join bots.

          // TODO(burdon): Able to promote POJOs to objects?
          //  E.g., POJOs returned as results from Amadeus; convert into ticket when accepted.
          offers.forEach((offer) => {
            // TODO(burdon): Check all itineraries are direct only.

            // TODO(burdon): THINK THROUGH SCHEMA: SIMPLIFIED VERSION OF AMADEUS.
            //  - E.g., Booking may have multiple legs, people, etc.
            //  - Trip has different types of bookings.

            for (const itinerary of offer.itineraries) {
              const { segments } = itinerary;
              if (segments.length === 1) {
                const segment = segments[0];
                const tickets: Trip.Booking['tickets'] = [];
                tickets.push({
                  source: {
                    vendor: offer.source,
                    guid: offer.id
                  },
                  origin: segment.departure.iataCode,
                  destination: segment.arrival.iataCode,
                  depart: segment.departure.at,
                  arrive: segment.arrival.at,
                  carrier: segment.carrierCode,
                  number: segment.number
                  // transaction: {
                  //   total: offer.price.total
                  // }
                });
              }
            }
          });
        }
      })
    );
  }

  override async onStop() {
    this._subscription?.();
  }
}
