//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

export type CredentialQuery = {
  service?: string;
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
