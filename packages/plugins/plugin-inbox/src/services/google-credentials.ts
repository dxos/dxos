//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CredentialsService } from '@dxos/compute';
import { Database, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';

/**
 * Creates the service interface from a cached token.
 * Falls back to database credentials if no cached token is provided.
 */
const makeService = (cachedToken: string | undefined): Context.Tag.Service<GoogleCredentials> => ({
  get: () =>
    cachedToken
      ? Effect.succeed(cachedToken)
      : Effect.map(CredentialsService.getCredential({ service: 'google.com' }), (c) => c.apiKey!),
});

/**
 * Service for accessing Google API credentials.
 *
 * Token sourcing follows the Trello pattern: the wrapping `Integration`
 * owns the `AccessToken`, and sync ops compose `fromIntegration(ref)` once
 * at the operation boundary. Falls back to database credentials when no
 * Integration is in scope (legacy / agent paths).
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, CredentialsService>;
  }
>() {
  /**
   * Creates a credentials layer from an Integration ref. Loads the
   * integration's `accessToken` and returns its `token` value.
   */
  static fromIntegration = (integrationRef: Ref.Ref<Integration.Integration>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const integration = yield* Database.load(integrationRef);
        const accessToken = yield* Database.load(integration.accessToken);
        if (accessToken?.token) {
          log('using integration access token', { source: accessToken.source, account: accessToken.account });
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
