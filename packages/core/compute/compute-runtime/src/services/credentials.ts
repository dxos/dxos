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
import { AccessToken } from '@dxos/link';
import { isManagedAccessToken } from '@dxos/protocols';

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

/** An `AccessToken` object reduced to what a credential needs, before any managed value is resolved. */
type TokenProjection = { accessTokenId: string; service: string; storedToken: string; account?: string };

/**
 * Credentials backed by the `AccessToken` objects in the current space, resolving server-custodied
 * values through {@link Credential.AccessTokenResolver}. `caching` memoizes the object lookup — never
 * the resolved token, which expires on the server's schedule.
 */
export const credentialsLayerFromDatabase = ({ caching = false }: { caching?: boolean } = {}) =>
  Layer.effect(
    Credential.CredentialsService,
    Effect.gen(function* () {
      const dbService = yield* Database.Service;
      const resolver = yield* Credential.AccessTokenResolver;
      // Holds unresolved projections, never resolved tokens: a managed token expires on the
      // server's schedule, so caching the resolved string here would outlive its validity.
      const cache = new Map<string, TokenProjection[]>();

      const queryTokens = async (query: Credential.CredentialQuery): Promise<TokenProjection[]> => {
        const cacheKey = JSON.stringify(query);
        const cached = cache.get(cacheKey);
        if (caching && cached) {
          return cached;
        }

        const accessTokens = await dbService.db.query(Query.type(AccessToken.AccessToken)).run();
        const matches = query.accessTokenId
          ? accessTokens.filter((accessToken) => accessToken.id === query.accessTokenId)
          : accessTokens.filter((accessToken) => accessToken.source === query.service);
        const projections = matches.map((accessToken) => ({
          accessTokenId: accessToken.id,
          service: accessToken.source,
          storedToken: accessToken.token,
          account: accessToken.account,
        }));

        if (caching) {
          cache.set(cacheKey, projections);
        }

        return projections;
      };

      const toCredential = async (projection: TokenProjection): Promise<Credential.ServiceCredential> => ({
        service: projection.service,
        apiKey: isManagedAccessToken(projection.storedToken)
          ? await resolver.resolve({ spaceId: dbService.db.spaceId, accessTokenId: projection.accessTokenId })
          : projection.storedToken,
        account: projection.account,
      });

      return {
        getCredential: async (query) => {
          const projections = await queryTokens(query);
          if (projections.length === 0) {
            throw new Error(
              query.accessTokenId
                ? `Credential not found: ${query.accessTokenId}`
                : `Credential not found for service: ${query.service}`,
            );
          }

          return toCredential(projections[0]);
        },
        queryCredentials: async (query) => {
          return Promise.all((await queryTokens(query)).map(toCredential));
        },
      };
    }),
  );
