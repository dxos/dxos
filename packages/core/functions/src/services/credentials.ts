//
// Copyright 2025 DXOS.org
//

import { HttpClient, HttpClientRequest } from '@effect/platform';
import type * as Config from 'effect/Config';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { Query } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { DatabaseService } from './database';

export type CredentialQuery = {
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

  static getApiKey = (query: CredentialQuery): Effect.Effect<Redacted.Redacted<string>, never, CredentialsService> =>
    Effect.gen(function* () {
      const credential = yield* CredentialsService.getCredential(query);
      if (!credential.apiKey) {
        throw new Error(`API key not found for service: ${query.service}`);
      }
      return Redacted.make(credential.apiKey);
    });

  static configuredLayer = (credentials: ServiceCredential[]) =>
    Layer.succeed(CredentialsService, new ConfiguredCredentialsService(credentials));

  static layerConfig = (credentials: { service: string; apiKey: Config.Config<Redacted.Redacted<string>> }[]) =>
    Layer.effect(
      CredentialsService,
      Effect.gen(function* () {
        const serviceCredentials = yield* Effect.forEach(credentials, ({ service, apiKey }) =>
          Effect.gen(function* () {
            return {
              service,
              apiKey: Redacted.value(yield* apiKey),
            };
          }),
        );

        return new ConfiguredCredentialsService(serviceCredentials);
      }),
    );

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

/**
 * Maps the request to include the API key from the credential.
 */
export const withAuthorization = (query: CredentialQuery, kind?: 'Bearer' | 'Basic') =>
  HttpClient.mapRequestEffect(
    Effect.fnUntraced(function* (request) {
      const key = yield* CredentialsService.getApiKey(query).pipe(Effect.map(Redacted.value));
      const authorization = kind ? `${kind} ${key}` : key;
      return HttpClientRequest.setHeader(request, 'Authorization', authorization);
    }),
  );
