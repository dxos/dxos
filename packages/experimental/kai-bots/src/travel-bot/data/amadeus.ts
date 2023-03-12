//
// Copyright 2023 DXOS.org
//

import AmadeusApi, { Config, Geolocation, Location, FlightQuery, FlightOffer } from 'amadeus';

export class Amadeus {
  private readonly _api: AmadeusApi;

  constructor(config: Config) {
    this._api = new AmadeusApi(config);
  }

  // TODO(burdon): Hotels.
  // TODO(burdon): Airline routes.

  async airports(geo: Geolocation): Promise<Location[]> {
    const { data } = await this._api.referenceData.locations.airports.get(geo);
    return data;
  }

  async cities({ keyword }: { keyword: string }): Promise<Location[]> {
    const { data } = await this._api.referenceData.locations.cities.get({ keyword });
    return data;
  }

  async flights(query: FlightQuery): Promise<FlightOffer[]> {
    const { data } = await this._api.shopping.flightOffersSearch.post(JSON.stringify(query));
    return data;
  }
}
