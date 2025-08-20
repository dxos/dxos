//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { Query } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { DatabaseService } from './database';

type CredentialQuery = {
  service?: string;
};

// TODO(dmaretskyi): Unify with other apis.
// packages/sdk/schema/src/common/access-token.ts
export type ServiceCredential = {
  service: string;

  // TODO(dmaretskyi): Build out.
  apiKey?: string;
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

  static configuredLayer = (credentials: ServiceCredential[]) =>
    Layer.succeed(CredentialsService, new ConfiguredCredentialsService(credentials));

  static layerFromDatabase = () =>
    Layer.effect(
      CredentialsService,
      Effect.gen(function* () {
        const dbService = yield* DatabaseService;
        const queryCredentials = async (query: CredentialQuery): Promise<ServiceCredential[]> => {
          const { objects: accessTokens } = await dbService.db.query(Query.type(DataType.AccessToken)).run();
          return accessTokens
            .filter((accessToken) => accessToken.source === query.service)
            .map((accessToken) => ({
              service: accessToken.source,
              apiKey: accessToken.token,
            }));
        };
        return {
          getCredential: async (query) => {
            const credentials = await queryCredentials(query);
            if (credentials.length === 0) {
              throw new Error(`Credential not found for service: ${query.service}`);
            }
            return credentials[0];
          },
          queryCredentials: async (query) => {
            return queryCredentials(query);
          },
        };
      }),
    );
}

export class ConfiguredCredentialsService implements Context.Tag.Service<CredentialsService> {
  constructor(private readonly credentials: ServiceCredential[] = []) {}

  addCredentials(credentials: ServiceCredential[]): ConfiguredCredentialsService {
    this.credentials.push(...credentials);
    return this;
  }

  async queryCredentials(query: CredentialQuery): Promise<ServiceCredential[]> {
    return this.credentials.filter((credential) => credential.service === query.service);
  }

  async getCredential(query: CredentialQuery): Promise<ServiceCredential> {
    const credential = this.credentials.find((credential) => credential.service === query.service);
    if (!credential) {
      throw new Error(`Credential not found for service: ${query.service}`);
    }
    return credential;
  }
}
