//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';
import { Database, Obj, type Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { type AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector';
import { isManagedAccessToken } from '@dxos/protocols';

/**
 * Creates the service interface from a cached token.
 * Falls back to database credentials if no cached token is provided.
 */
const makeService = (cachedToken: string | undefined): Context.Tag.Service<GoogleCredentials> => ({
  get: () =>
    cachedToken
      ? Effect.succeed(cachedToken)
      : Effect.map(Credential.CredentialsService.getCredential({ service: 'google.com' }), (c) => c.apiKey!),
});

/**
 * Serves a server-custodied token, fetched per use rather than read off the object. The resolver is
 * captured when the layer is built but called on every `get()`, so a long-running sync picks up a
 * rotated token instead of holding the one that was live when it started.
 */
const makeManagedService = (
  resolver: Context.Tag.Service<Credential.AccessTokenResolver>,
  spaceId: SpaceId,
  accessTokenId: string,
): Context.Tag.Service<GoogleCredentials> => ({
  get: () => Effect.promise(() => resolver.resolve({ spaceId, accessTokenId })),
});

/** Builds the service for a loaded token: managed ones resolve via EDGE, others use the stored value. */
const makeServiceForToken = (
  resolver: Context.Tag.Service<Credential.AccessTokenResolver>,
  accessToken: AccessToken.AccessToken | undefined,
): Context.Tag.Service<GoogleCredentials> => {
  if (!accessToken?.token) {
    return makeService(undefined);
  }
  if (isManagedAccessToken(accessToken.token)) {
    // The owning space is read off the object rather than `Database.Service`, which the layer does
    // not otherwise require and whose callers therefore do not declare.
    const spaceId = Obj.getDatabase(accessToken)?.spaceId;
    invariant(spaceId, 'Managed access token is not bound to a space.');
    log('using managed access token', { source: accessToken.source, account: accessToken.account });
    return makeManagedService(resolver, spaceId, accessToken.id);
  }
  log('using access token', { source: accessToken.source, account: accessToken.account });
  return makeService(accessToken.token);
};

/**
 * Service for accessing Google API credentials.
 *
 * Token sourcing: an operation invoked with a `Connection` composes `fromConnection(ref)`; one
 * invoked with an external-sync cursor composes `fromAccessToken(cursor.spec.source)` directly (the
 * cursor no longer relates to `Connection`). Falls back to database credentials when neither is in
 * scope (legacy / agent paths).
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, Credential.CredentialsService>;
  }
>() {
  /** Creates a credentials layer from an AccessToken ref. Loads it and returns its `token` value. */
  static fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const resolver = yield* Credential.AccessTokenResolver;
        const accessToken = yield* Database.load(accessTokenRef);
        return makeServiceForToken(resolver, accessToken);
      }),
    );

  /** Creates a credentials layer from a Connection ref. Loads its `accessToken` and returns its `token`. */
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const resolver = yield* Credential.AccessTokenResolver;
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        return makeServiceForToken(resolver, accessToken);
      }),
    );

  /**
   * Default layer that uses database credentials.
   * Use this for operations that don't have an associated config.
   */
  static default = Layer.succeed(GoogleCredentials, makeService(undefined));

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(GoogleCredentials, (service) => service.get());
}
