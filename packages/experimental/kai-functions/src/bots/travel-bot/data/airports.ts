//
// Copyright 2023 DXOS.org
//

import { parse } from 'csv-parse';
import fetch from 'node-fetch';

import { Trigger } from '@dxos/async';

import { stringMatch } from '../../util';

// TODO(burdon): Kai types.
export type Geolocation = {
  latitude: number;
  longitude: number;
};

export type Airport = {
  code: string;
  name: string;
  location: Geolocation;
  continent: string;
  country: string;
  region: string;
  municipality: string;
  link: string;
};

/**
 * Airport database.
 * A faster "canned" airport look-up vs. Amadeus.
 */
export class Airports {
  constructor(private readonly _airports: Airport[] = []) {}

  toString() {
    return `Airports(${this._airports.length})`;
  }

  get airports() {
    return this._airports;
  }

  async search(text: string | undefined, filter?: Partial<Airport>): Promise<Airport[]> {
    const matcher = text?.length ? stringMatch(text, true) : undefined;
    const matchText = matcher
      ? (airport: Airport) => {
          return matcher(airport.code) || matcher(airport.name) || matcher(airport.municipality);
        }
      : undefined;

    const matchFilter = Object.keys(filter ?? {}).length
      ? (airport: Airport) => {
          const getValue = (object: any, key: string) => object[key].toLowerCase();
          return !Object.keys(filter ?? {}).some((key) => getValue(airport, key).indexOf(getValue(filter, key)) === -1);
        }
      : undefined;

    return this._airports.filter(
      (airport) => (!matchText || matchText(airport)) && (!matchFilter || matchFilter(airport)),
    );
  }
}

/**
 * https://ourairports.com
 */
// TODO(burdon): Load/save to disk.
export const fetchAirports = async (): Promise<Airport[]> => {
  const trigger = new Trigger<Airport[]>();
  const airports: Airport[] = [];

  const parser = parse({ delimiter: ',', columns: true });
  parser.on('end', () => trigger.wake(airports));
  parser.on('error', () => trigger.wake([]));
  parser.on('readable', () => {
    let record: Record<string, any>;
    while ((record = parser.read())) {
      // About Filter to about 500.
      if (record.type === 'large_airport') {
        airports.push({
          code: record.iata_code,
          name: record.name,
          location: {
            latitude: Number(record.latitude_deg),
            longitude: Number(record.longitude_deg),
          },
          continent: record.continent,
          country: record.iso_country,
          region: record.iso_region,
          municipality: record.municipality,
          link: record.wikipedia_link,
        });
      }
    }
  });

  const response = await fetch('http://ourairports.com/data/airports.csv');
  response.body.pipe(parser);

  return await trigger.wait();
};
