//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { type SpaceId } from '@dxos/keys';

export type CredentialQuery = {
  service?: string;
  /**
   * Look up one specific `AccessToken` object instead of any credential for a service. Required
   * wherever a space can hold several connections to the same service, since a by-service lookup
   * picks among them arbitrarily.
   */
  accessTokenId?: string;
};

// TODO(dmaretskyi): Unify with other apis.
// packages/sdk/schema/src/common/access-token.ts
export type ServiceCredential = {
  service: string;

  // TODO(dmaretskyi): Build out.
  apiKey?: string;

  /** Non-secret secondary identifier carried alongside the credential (e.g. an account id or report id). */
  account?: string;
};

/**
 * Source for credentials EDGE custodies rather than replicating into the space (those stored as
 * `MANAGED_ACCESS_TOKEN`).
 *
 * An implementation detail of {@link CredentialsService}, not a consumer-facing service: it exists
 * as a tag only because the two surfaces reach EDGE differently — clients over authenticated HTTP,
 * functions over a space-bound service binding. Implementations cache; pass `refresh` to bypass that
 * cache after an authorization failure.
 */
export class AccessTokenResolver extends Context.Tag('@dxos/functions/AccessTokenResolver')<
  AccessTokenResolver,
  {
    resolve: (request: { spaceId: SpaceId; accessTokenId: string; refresh?: boolean }) => Promise<string>;
  }
>() {
  static resolve = (request: {
    spaceId: SpaceId;
    accessTokenId: string;
    refresh?: boolean;
  }): Effect.Effect<string, never, AccessTokenResolver> =>
    Effect.gen(function* () {
      const resolver = yield* AccessTokenResolver;
      return yield* Effect.promise(() => resolver.resolve(request));
    });

  /**
   * Fails on every managed token. The default where EDGE is unreachable (tests, offline CLI runs):
   * a managed credential genuinely cannot be resolved there, and failing says so.
   */
  static notAvailable = Layer.succeed(AccessTokenResolver, {
    resolve: async ({ accessTokenId }) => {
      throw new Error(`No access token resolver configured; cannot resolve managed token: ${accessTokenId}`);
    },
  });
}

export class CredentialsService extends Context.Tag('@dxos/functions/CredentialsService')<
  CredentialsService,
  {
    /**
     * Query all.
     */
    queryCredentials: (query: CredentialQuery) => Promise<ServiceCredential[]>;

    /**
     * Get a single credential.
     * @throws {Error} If no credential is found.
     */
    getCredential: (query: CredentialQuery) => Promise<ServiceCredential>;
  }
>() {
  static getCredential = (query: CredentialQuery): Effect.Effect<ServiceCredential, never, CredentialsService> =>
    Effect.gen(function* () {
      const credentials = yield* CredentialsService;
      return yield* Effect.promise(() => credentials.getCredential(query));
    });

  static getApiKey = (query: CredentialQuery): Effect.Effect<Redacted.Redacted<string>, never, CredentialsService> =>
    Effect.gen(function* () {
      const credential = yield* CredentialsService.getCredential(query);
      if (!credential.apiKey) {
        throw new Error(`API key not found for service: ${query.service}`);
      }
      return Redacted.make(credential.apiKey);
    });
}
