//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import type * as Config from 'effect/Config';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { Credential } from '@dxos/compute';
import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

export class ConfiguredCredentialsService implements Context.Tag.Service<Credential.CredentialsService> {
  constructor(private readonly credentials: Credential.ServiceCredential[] = []) {}

  addCredentials(credentials: Credential.ServiceCredential[]): ConfiguredCredentialsService {
    this.credentials.push(...credentials);
    return this;
  }

  async queryCredentials(query: Credential.CredentialQuery): Promise<Credential.ServiceCredential[]> {
    return this.credentials.filter((credential) => credential.service === query.service);
  }

  async getCredential(query: Credential.CredentialQuery): Promise<Credential.ServiceCredential> {
    const credential = this.credentials.find((credential) => credential.service === query.service);
    if (!credential) {
      throw new Error(`Credential not found for service: ${query.service}`);
    }

    return credential;
  }
}

/**
 * Maps the request to include the given token in the Authorization header.
 */
export const withAuthorization = (token: string, kind?: 'Bearer' | 'Basic') =>
  HttpClient.mapRequest((request) => {
    const authorization = kind ? `${kind} ${token}` : token;
    return HttpClientRequest.setHeader(request, 'Authorization', authorization);
  });

export const configuredCredentialsLayer = (credentials: Credential.ServiceCredential[]) =>
  Layer.succeed(Credential.CredentialsService, new ConfiguredCredentialsService(credentials));

export const credentialsLayerConfig = (
  credentials: {
    service: string;
    apiKey: Config.Config<Redacted.Redacted<string>>;
  }[],
) =>
  Layer.effect(
    Credential.CredentialsService,
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

export const credentialsLayerFromDatabase = ({ caching = false }: { caching?: boolean } = {}) =>
  Layer.effect(
    Credential.CredentialsService,
    Effect.gen(function* () {
      const dbService = yield* Database.Service;
      const cache = new Map<string, Credential.ServiceCredential[]>();

      const queryCredentials = async (query: Credential.CredentialQuery): Promise<Credential.ServiceCredential[]> => {
        const cacheKey = JSON.stringify(query);
        if (caching && cache.has(cacheKey)) {
          return cache.get(cacheKey)!;
        }

        const accessTokens = await dbService.db.query(Query.type(AccessToken.AccessToken)).run();
        const credentials = accessTokens
          .filter((accessToken) => accessToken.source === query.service)
          .map((accessToken) => ({
            service: accessToken.source,
            apiKey: accessToken.token,
            account: accessToken.account,
          }));

        if (caching) {
          cache.set(cacheKey, credentials);
        }

        return credentials;
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
