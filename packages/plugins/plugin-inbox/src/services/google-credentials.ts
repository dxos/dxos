//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';
import { Database, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Connection } from '@dxos/types';

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
 * Service for accessing Google API credentials.
 *
 * Token sourcing follows the Trello pattern: the `Connection` owns the
 * `AccessToken`, and sync ops compose `fromConnection(ref)` once at the
 * operation boundary. Falls back to database credentials when no Connection
 * is in scope (legacy / agent paths).
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, Credential.CredentialsService>;
  }
>() {
  /**
   * Creates a credentials layer from a Connection ref. Loads the
   * connection's `accessToken` and returns its `token` value.
   */
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        if (accessToken?.token) {
          log('using connection access token', { source: accessToken.source, account: accessToken.account });
          return makeService(accessToken.token);
        }
        return makeService(undefined);
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
