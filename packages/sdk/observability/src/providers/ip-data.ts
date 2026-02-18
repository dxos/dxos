//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

import { type DataProvider } from '../observability';

const IP_DATA_CACHE_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours

const IPData = Schema.Struct({
  city: Schema.String,
  region: Schema.String,
  country: Schema.String,
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
});
type IPData = Schema.Schema.Type<typeof IPData>;

type CachedIPData = {
  data: IPData;
  timestamp: number;
};

const getIPData = Effect.fn(function* (config: Config) {
  const httpClient = yield* HttpClient.HttpClient;

  // Check cache first.
  const cachedData = yield* Effect.promise(() => localForage.getItem<CachedIPData>('dxos:observability:ipdata'));
  if (cachedData && cachedData.timestamp > Date.now() - IP_DATA_CACHE_TIMEOUT) {
    return cachedData.data;
  }

  // Fetch data if not cached.
  const IPDATA_API_KEY = config.get('runtime.app.env.DX_IPDATA_API_KEY');
  if (IPDATA_API_KEY) {
    const data = yield* HttpClientRequest.get(`https://api.ipdata.co?api-key=${IPDATA_API_KEY}`).pipe(
      httpClient.execute,
      Effect.flatMap((res) => res.json),
      Effect.flatMap(Schema.decodeUnknown(IPData)),
    );

    // Cache data.
    yield* Effect.promise(() =>
      localForage.setItem('dxos:observability:ipdata', {
        data,
        timestamp: Date.now(),
      }),
    );

    return data;
  }
});

/** Fetches IP geolocation data and sets city/region/country tags on the observability instance. */
export const provider =
  (config: Config): DataProvider =>
  (observability) =>
    Effect.gen(function* () {
      const ipData = yield* getIPData(config);
      if (!ipData) {
        return;
      }

      observability.setTags({
        city: ipData.city,
        region: ipData.region,
        country: ipData.country,
        latitude: ipData.latitude,
        longitude: ipData.longitude,
      });
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.catchAll((err) =>
        Effect.sync(() => {
          log.catch(err);
        }),
      ),
    );
