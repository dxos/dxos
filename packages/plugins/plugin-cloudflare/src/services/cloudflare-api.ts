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

/** Stored as `AccessToken.token`; sent as `Authorization: Bearer <token>`. */
type CloudflareCredentialsValue = {
  token: string;
};

//
// Subset schemas for the responses we care about.
//

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

/**
 * Every v4 response wraps its payload in a `{ success, errors, messages, result }` envelope, so the
 * result schema is applied one level down rather than to the body.
 */
const envelope = <T>(result: Schema.Codec<T>) => Schema.Struct({ result });

/**
 * Credentials for the Cloudflare API. Supplied as a layer so callers choose where the token comes
 * from — a loaded `AccessToken`, a `Connection`, or a literal in tests.
 */
export class CloudflareCredentials extends Context.Service<CloudflareCredentials, CloudflareCredentialsValue>()(
  '@dxos/plugin-cloudflare/CloudflareCredentials',
) {}

/** Creates a credentials layer from an AccessToken ref. Loads it and returns its `token`. */
export const fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
  Layer.effect(
    CloudflareCredentials,
    Effect.gen(function* () {
      const accessToken = yield* Database.load(accessTokenRef);
      return { token: accessToken.token };
    }),
  );

/** Creates a credentials layer from a Connection ref. Loads its `accessToken` and returns its `token`. */
export const fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
  Layer.effect(
    CloudflareCredentials,
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return { token: accessToken.token };
    }),
  );

//
// Request pipeline
//

/** Everything a request can fail with: a transport or status error, a decode failure, or a timeout. */
export type CloudflareError = HttpClientError.HttpClientError | Schema.SchemaError | Cause.TimeoutError;

type CloudflareEffect<T> = Effect.Effect<T, CloudflareError, HttpClient.HttpClient | CloudflareCredentials>;

/**
 * Transport failures and timeouts are transient, and so are 429 / 5xx. A 4xx other than 429 is the
 * token being rejected — retrying spends the rate-limit budget to get the same answer. A decode
 * failure will not decode on the second attempt either.
 */
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

/**
 * Fetch and decode one v4 endpoint. `filterStatusOk` runs before decoding so a rejected token
 * surfaces as its status code rather than as a decode failure against the error envelope.
 *
 * Routed through EDGE's CORS proxy rather than called directly: `api.cloudflare.com` returns no
 * `Access-Control-Allow-Origin` on any response and rejects the preflight an `Authorization` header
 * forces, so a browser fetch never reaches it. The proxy reads the credential from
 * `X-Cors-Proxy-Authorization`, since a bare `Authorization` would be consumed as the proxy's own.
 */
const cloudflareRequest = <T>(path: string, result: Schema.Codec<T>): CloudflareEffect<T> =>
  Effect.gen(function* () {
    const { token } = yield* CloudflareCredentials;
    const httpClient = yield* HttpClient.HttpClient;
    const client = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );
    const request = HttpClientRequest.get(`${CLOUDFLARE_PROXY_BASE}${path}`).pipe(
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

//
// Endpoints
//

/** The authenticated user; needs the `user-details.read` scope. */
export const fetchUser = (): CloudflareEffect<CloudflareUser> => cloudflareRequest('/user', CloudflareUserSchema);

/** The accounts the grant can see; needs the `memberships.read` scope. */
export const fetchAccounts = (): CloudflareEffect<readonly CloudflareAccount[]> =>
  cloudflareRequest('/accounts', Schema.Array(CloudflareAccountSchema));
