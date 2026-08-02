//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Credential from '@dxos/compute/Credential';
import { Database, type Ref } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import * as Connection from '@dxos/plugin-connector/Connection';

import { GOOGLE_INTEGRATION_SOURCE } from '../constants';

/**
 * Reads a credential through {@link Credential.CredentialsService}, which resolves a server-custodied
 * token transparently — consumers here never see whether the value came from the space or from EDGE.
 *
 * Resolution is deferred to `get()` rather than done when the layer is built, so a long-running sync
 * picks up a rotated token instead of holding the one that was live when it started.
 */
const makeService = (query: Credential.CredentialQuery): Context.Tag.Service<GoogleCredentials> => ({
  get: () => Credential.getApiKeyValue(query),
});

/**
 * Binds to one specific `AccessToken` when the operation was invoked with a connection or cursor.
 * A by-service lookup would pick arbitrarily among a space's Google connections.
 */
const makeServiceForToken = (accessToken: AccessToken.AccessToken | undefined) => {
  if (!accessToken) {
    return makeService({ service: GOOGLE_INTEGRATION_SOURCE });
  }
  log('using access token', { source: accessToken.source, account: accessToken.account });
  return makeService({ accessTokenId: accessToken.id });
};

/**
 * Service for accessing Google API credentials.
 *
 * Token sourcing: an operation invoked with a `Connection` composes `fromConnection(ref)`; one
 * invoked with an external-sync cursor composes `fromAccessToken(cursor.spec.source)` directly (the
 * cursor no longer relates to `Connection`). Falls back to a by-service lookup when neither is in
 * scope (legacy / agent paths).
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, Credential.CredentialsService>;
  }
>() {
  /** Creates a credentials layer bound to an AccessToken ref. */
  static fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
    Layer.effect(GoogleCredentials, Effect.map(Database.load(accessTokenRef), makeServiceForToken));

  /** Creates a credentials layer bound to a Connection's AccessToken. */
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        return makeServiceForToken(yield* Database.load(connection.accessToken));
      }),
    );

  /**
   * Default layer that looks the credential up by service.
   * Use this for operations that don't have an associated config.
   */
  static default = Layer.succeed(GoogleCredentials, makeService({ service: GOOGLE_INTEGRATION_SOURCE }));

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(GoogleCredentials, (service) => service.get());
}
