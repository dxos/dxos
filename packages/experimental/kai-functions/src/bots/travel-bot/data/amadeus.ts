//
// Copyright 2023 DXOS.org
//

import AmadeusApi, { type Config, type Geolocation, type Location, type FlightQuery, type FlightOffer } from 'amadeus';
import defaultsDeep from 'lodash.defaultsdeep';

import { log } from '@dxos/log';

const defaultFlightQuery: Partial<FlightQuery> = {
  sources: ['GDS'],
  travelers: [
    {
      id: '1',
      travelerType: 'ADULT',
    },
  ],
};

// TODO(burdon): Builder pattern?
export const createFlightQuery = (query: Partial<FlightQuery>): FlightQuery =>
  defaultsDeep({}, query, defaultFlightQuery);

export class Amadeus {
  private readonly _api: AmadeusApi;

  constructor(config: Config) {
    this._api = new AmadeusApi(config);
  }

  // TODO(burdon): Hotels.
  // TODO(burdon): Airline routes.

  async airports(location: Geolocation): Promise<Location[]> {
    log('airports', { location });
    const { data } = await this._api.referenceData.locations.airports.get(location);
    log('result', { data: data.length });
    return data;
  }

  async cities({ keyword }: { keyword: string }): Promise<Location[]> {
    log('cities', { keyword });
    const { data } = await this._api.referenceData.locations.cities.get({ keyword });
    log('result', { data: data.length });
    return data;
  }

  async flights(query: FlightQuery): Promise<FlightOffer[]> {
    log.info('flights', { query });
    const { data } = await this._api.shopping.flightOffersSearch.post(JSON.stringify(query));
    log('result', { data: data.length });
    return data;
  }
}
