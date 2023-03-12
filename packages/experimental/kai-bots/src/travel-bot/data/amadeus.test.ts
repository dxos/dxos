//
// Copyright 2023 DXOS.org
//

import { FlightOffer, FlightQuery } from 'amadeus';
import { add, formatISO9075 } from 'date-fns';

import { Config } from '@dxos/config';
import { describe, test } from '@dxos/test';

import { getKey, loadJson } from '../../util';
import { Amadeus } from './amadeus';

describe('amadeus', () => {
  const config = new Config(loadJson(process.env.TEST_CONFIG!));

  const amadeus = new Amadeus({
    clientId: getKey(config, 'com.amadeus.client_id')!,
    clientSecret: getKey(config, 'com.amadeus.client_secret')!
  });

  // TODO(burdon): Create CLI to output JSON (jq).

  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('cities', async () => {
    const cities = await amadeus.cities({ keyword: 'lon' });
    console.log(cities);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('airports', async () => {
    const airports = await amadeus.airports({ latitude: 51, longitude: 0 });
    console.log(airports);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('flights', async () => {
    // TODO(burdon): IATA code for NY airports (e.g., incl. EWR) is NYC?
    const origin = 'JFK';
    const destination = 'CDG';

    const query: FlightQuery = {
      sources: ['GDS'], // TODO(burdon): ???
      currencyCode: 'USD',
      originDestinations: [
        {
          id: '1',
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDateTimeRange: {
            date: formatISO9075(add(Date.now(), { days: 7 }), { representation: 'date' })
          }
        },
        {
          id: '2',
          originLocationCode: destination,
          destinationLocationCode: origin,
          departureDateTimeRange: {
            date: formatISO9075(add(Date.now(), { days: 14 }), { representation: 'date' })
          }
        }
      ],
      travelers: [
        {
          id: '1',
          travelerType: 'ADULT'
        }
      ],
      searchCriteria: {
        flightFilters: {
          cabinRestrictions: [{ cabin: 'BUSINESS', originDestinationIds: ['1', '2'] }],
          carrierRestrictions: {
            includedCarrierCodes: ['AF']
          }
        }
      }
    };

    // TODO(burdon): Filter for nonstop.
    //  https://github.com/amadeus4dev/amadeus-code-examples/issues/18
    const offers = await amadeus.flights(query);
    const filtered = offers.reduce<FlightOffer[]>((results, offer) => {
      for (const itinerary of offer.itineraries) {
        if (itinerary.segments.length === 1) {
          results.push(offer);
        }
      }

      return results;
    }, []);

    console.log(JSON.stringify(filtered, undefined, 2));
  });
});
