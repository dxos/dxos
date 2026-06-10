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

// ipdata.co v1 response — city/region/latitude/longitude are nullable for some IPs (VPNs, CDNs, etc.),
// and the country field is named `country_name`, not `country`.
const IPData = Schema.Struct({
  city: Schema.NullOr(Schema.String),
  region: Schema.NullOr(Schema.String),
  country_name: Schema.String,
  latitude: Schema.NullOr(Schema.Number),
  longitude: Schema.NullOr(Schema.Number),
});
type IPData = Schema.Schema.Type<typeof IPData>;

type CachedIPData = {
  data: IPData;
  timestamp: number;
};

const getIPData = Effect.fn(function* (config: Config) {
  const httpClient = yield* HttpClient.HttpClient;

  // Disable tracing to avoid CORS errors from traceparent header on cross-origin requests.
  const httpClientNoTrace = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  // Check cache first.
  // v2 key discards entries cached by the previous schema (which used `country` instead of `country_name`).
  const cachedData = yield* Effect.promise(() => localForage.getItem<CachedIPData>('dxos:observability:ipdata:v2'));
  if (cachedData && cachedData.timestamp > Date.now() - IP_DATA_CACHE_TIMEOUT) {
    return cachedData.data;
  }

  // Fetch data if not cached.
  const IPDATA_API_KEY = config.get('runtime.app.env.DX_IPDATA_API_KEY');
  if (!IPDATA_API_KEY) {
    log.warn('DX_IPDATA_API_KEY is not configured; IP geolocation tags will be absent from telemetry');
    return cachedData?.data;
  }

  const data = yield* HttpClientRequest.get(`https://api.ipdata.co?api-key=${IPDATA_API_KEY}`).pipe(
    httpClientNoTrace.execute,
    Effect.flatMap((res) => res.json),
    Effect.flatMap(Schema.decodeUnknown(IPData)),
    // On failure fall back to stale cache rather than emitting no tags.
    Effect.catchAll((err) =>
      Effect.sync(() => {
        log.warn('ipdata fetch failed; IP geolocation tags will be absent or stale', { err });
        return cachedData?.data;
      }),
    ),
  );

  if (data) {
    yield* Effect.promise(() =>
      localForage.setItem('dxos:observability:ipdata:v2', { data, timestamp: Date.now() }),
    );
  }

  return data;
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
        ...(ipData.city != null && { city: ipData.city }),
        ...(ipData.region != null && { region: ipData.region }),
        country: ipData.country_name,
        ...(ipData.latitude != null && { latitude: ipData.latitude }),
        ...(ipData.longitude != null && { longitude: ipData.longitude }),
      });
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.catchAll((err) =>
        Effect.sync(() => {
          log.warn('ipdata provider failed', { err });
        }),
      ),
    );
