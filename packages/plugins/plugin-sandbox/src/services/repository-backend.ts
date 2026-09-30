//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import type * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';

import { type Client } from '@dxos/client';

import * as RepositoryService from '../types/RepositoryService.ts';
import { type RepositoryClient } from './RepositoryClient.ts';
import { createRepositoryClient } from './sandbox-url.ts';
import { type SandboxRequestError } from './SandboxClient.ts';

/**
 * Repositories on EDGE's sandbox-service. The REST client is built per call, as for sandboxes: the
 * service URL comes from config that may be missing, which is then an error of the call.
 */
export const makeEdgeRepositoryBackend = (client: Client): RepositoryService.Backend =>
  makeRepositoryBackend(() => createRepositoryClient(client), FetchHttpClient.layer);

/** A backend over any {@link RepositoryClient} and transport; the seam tests stub. */
export const makeRepositoryBackend = (
  createClient: () => RepositoryClient,
  httpLayer: Layer.Layer<HttpClient.HttpClient>,
): RepositoryService.Backend => {
  const request = <T>(
    send: (repositoryClient: RepositoryClient) => Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>,
  ): Effect.Effect<T, SandboxRequestError | RepositoryService.RepositoryError> =>
    Effect.try({
      try: createClient,
      catch: (cause) => new RepositoryService.RepositoryError({ message: describeError(cause), cause }),
    }).pipe(Effect.flatMap((repositoryClient) => send(repositoryClient).pipe(Effect.provide(httpLayer))));

  const toRepositoryError = <T>(
    effect: Effect.Effect<T, SandboxRequestError | RepositoryService.RepositoryError>,
  ): Effect.Effect<T, RepositoryService.RepositoryError> =>
    effect.pipe(
      Effect.mapError((cause) =>
        cause instanceof RepositoryService.RepositoryError
          ? cause
          : new RepositoryService.RepositoryError({ message: describeError(cause), cause }),
      ),
    );

  /** A read of a repository the service does not have yet creates it, then reads again. */
  const read = <T>(
    spaceId: string,
    repositoryId: string,
    send: (repositoryClient: RepositoryClient) => Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>,
  ): Effect.Effect<T, RepositoryService.RepositoryError> =>
    toRepositoryError(
      request(send).pipe(
        Effect.catchIf(isNotFound, () =>
          request((repositoryClient) => repositoryClient.createRepository(spaceId, repositoryId)).pipe(
            Effect.flatMap(() => request(send)),
          ),
        ),
      ),
    );

  return {
    create: (spaceId, repositoryId, options) =>
      toRepositoryError(
        request((repositoryClient) => repositoryClient.createRepository(spaceId, repositoryId, options)),
      ),
    get: (spaceId, repositoryId) =>
      read(spaceId, repositoryId, (repositoryClient) => repositoryClient.getRepository(spaceId, repositoryId)),
    delete: (spaceId, repositoryId) =>
      toRepositoryError(request((repositoryClient) => repositoryClient.deleteRepository(spaceId, repositoryId))),
    branches: (spaceId, repositoryId) =>
      read(spaceId, repositoryId, (repositoryClient) => repositoryClient.listBranches(spaceId, repositoryId)),
    log: (spaceId, repositoryId, options) =>
      read(spaceId, repositoryId, (repositoryClient) => repositoryClient.log(spaceId, repositoryId, options)),
    tree: (spaceId, repositoryId, options) =>
      read(spaceId, repositoryId, (repositoryClient) => repositoryClient.readTree(spaceId, repositoryId, options)),
    readFile: (spaceId, repositoryId, options) =>
      read(spaceId, repositoryId, (repositoryClient) => repositoryClient.readFile(spaceId, repositoryId, options)),
  };
};

const isNotFound = (error: unknown): boolean =>
  HttpClientError.isHttpClientError(error) && error.response?.status === 404;

const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
