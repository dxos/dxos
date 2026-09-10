//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { Database, type Ref } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';

import { CLOUDFLARE_PROXY_BASE } from '../constants';

type CloudflareCredentialsValue = {
  token: string;
};

const CloudflareUserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.NullOr(Schema.String).pipe(Schema.optional),
  username: Schema.NullOr(Schema.String).pipe(Schema.optional),
});
export type CloudflareUser = Schema.Schema.Type<typeof CloudflareUserSchema>;

const CloudflareAccountSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
export type CloudflareAccount = Schema.Schema.Type<typeof CloudflareAccountSchema>;

/** Every v4 response wraps its payload in a `{ success, errors, messages, result }` envelope. */
const envelope = <T>(result: Schema.Codec<T>) => Schema.Struct({ result });

export class CloudflareCredentials extends Context.Service<CloudflareCredentials, CloudflareCredentialsValue>()(
  '@dxos/plugin-cloudflare/CloudflareCredentials',
) {}

export const fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
  Layer.effect(
    CloudflareCredentials,
    Effect.gen(function* () {
      const accessToken = yield* Database.load(accessTokenRef);
      return { token: accessToken.token };
    }),
  );

export const fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
  Layer.effect(
    CloudflareCredentials,
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return { token: accessToken.token };
    }),
  );

export type CloudflareError = HttpClientError.HttpClientError | Schema.SchemaError | Cause.TimeoutError;

type CloudflareEffect<T> = Effect.Effect<T, CloudflareError, HttpClient.HttpClient | CloudflareCredentials>;

const shouldRetry = (error: CloudflareError): boolean => {
  if (error instanceof Schema.SchemaError) {
    return false;
  }
  if (Cause.isTimeoutError(error)) {
    return true;
  }
  if (error.reason._tag !== 'StatusCodeError') {
    return true;
  }
  const status = error.reason.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

const cloudflareRequest = <T>(path: string, result: Schema.Codec<T>): CloudflareEffect<T> =>
  Effect.gen(function* () {
    const { token } = yield* CloudflareCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const client = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );
    const request = HttpClientRequest.get(`${CLOUDFLARE_PROXY_BASE}${path}`).pipe(
      // EDGE's CORS proxy consumes a bare `Authorization` as its own.
      HttpClientRequest.setHeader('X-Cors-Proxy-Authorization', `Bearer ${token}`),
      HttpClientRequest.setHeader('Accept', 'application/json'),
    );
    const response = yield* client.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknownEffect(envelope(result)))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.upTo({ times: 3 })),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
    return response.result;
  });

/** The authenticated user; needs the `user-details.read` scope. */
export const fetchUser = (): CloudflareEffect<CloudflareUser> => cloudflareRequest('/user', CloudflareUserSchema);

/** The accounts the grant can see; needs the `memberships.read` scope. */
export const fetchAccounts = (): CloudflareEffect<readonly CloudflareAccount[]> =>
  cloudflareRequest('/accounts', Schema.Array(CloudflareAccountSchema));
