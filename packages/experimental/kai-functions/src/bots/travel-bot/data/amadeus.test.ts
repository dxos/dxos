//
// Copyright 2023 DXOS.org
//

import { FlightOffer, FlightQuery } from 'amadeus';
import { expect } from 'chai';
import { add, formatISO9075 } from 'date-fns';

import { Config } from '@dxos/config';
import { beforeAll, describe, test } from '@dxos/test';

import { Amadeus } from './amadeus';
import { getKey, loadJson } from '../../util';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('amadeus', () => {
  let amadeus: Amadeus;

  beforeAll(() => {
    const config = new Config(loadJson(process.env.TEST_CONFIG!));
    amadeus = new Amadeus({
      clientId: getKey(config, 'com.amadeus.client_id')!,
      clientSecret: getKey(config, 'com.amadeus.client_secret')!,
    });
  });

  // TODO(burdon): Create CLI tool (JSON output).

  // eslint-disable-next-line mocha/no-skipped-tests
  test('cities', async () => {
    const cities = await amadeus.cities({ keyword: 'lon' });
    // console.log(cities);
    expect(cities).to.exist;
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  test('airports', async () => {
    const airports = await amadeus.airports({ latitude: 51, longitude: 0 });
    // console.log(airports);
    expect(airports).to.exist;
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  test('flights', async () => {
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
            date: formatISO9075(add(Date.now(), { days: 7 }), { representation: 'date' }),
          },
        },
        {
          id: '2',
          originLocationCode: destination,
          destinationLocationCode: origin,
          departureDateTimeRange: {
            date: formatISO9075(add(Date.now(), { days: 14 }), { representation: 'date' }),
          },
        },
      ],
      travelers: [
        {
          id: '1',
          travelerType: 'ADULT',
        },
      ],
      searchCriteria: {
        flightFilters: {
          cabinRestrictions: [{ cabin: 'BUSINESS', originDestinationIds: ['1', '2'] }],
          carrierRestrictions: {
            includedCarrierCodes: ['AF'],
          },
        },
      },
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

    // console.log(JSON.stringify(filtered, undefined, 2));
    expect(filtered).to.exist;
  });
});
