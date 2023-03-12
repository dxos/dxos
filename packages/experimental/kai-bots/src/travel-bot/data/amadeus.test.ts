//
// Copyright 2023 DXOS.org
//

import { FlightOffer, FlightQuery } from 'amadeus';
import { add, formatISO9075 } from 'date-fns';
import faker from 'faker';

import { Config } from '@dxos/config';
import { beforeAll, describe, test } from '@dxos/test';

import { getKey, loadJson } from '../../util';
import { Airports, fetchAirports } from './airports';
import { Amadeus } from './amadeus';

describe('amadeus', () => {
  const config = new Config(loadJson(process.env.TEST_CONFIG!));
  const amadeus = new Amadeus({
    clientId: getKey(config, 'com.amadeus.client_id')!,
    clientSecret: getKey(config, 'com.amadeus.client_secret')!
  });

  let airports: Airports;

  beforeAll(async () => {
    airports = new Airports(await fetchAirports());
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
    const origin = faker.random.arrayElement(await airports.search(undefined, { code: 'JFK' }));
    const destination = faker.random.arrayElement(await airports.search(undefined, { code: 'CDG' }));

    const query: FlightQuery = {
      sources: ['GDS'], // TODO(burdon): ???
      currencyCode: 'USD',
      originDestinations: [
        {
          id: '1',
          originLocationCode: origin.code,
          destinationLocationCode: destination.code,
          departureDateTimeRange: {
            date: formatISO9075(add(Date.now(), { days: 7 }), { representation: 'date' })
          }
        },
        {
          id: '2',
          originLocationCode: destination.code,
          destinationLocationCode: origin.code,
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
