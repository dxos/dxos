//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client } from '@dxos/client';
import { Query } from '@dxos/echo';
import { type BlobBackend } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';

import {
  type CredentialResolver,
  createCredentialResolver,
  formatUri,
  getObject,
  getObjectUrl,
  headObject,
  objectKey,
  parseUri,
  putObject,
} from '#services';

import { S3_BACKEND, S3_CONNECTOR_ID, S3_SCHEME } from '../constants';

type WriteEndpoint = { host: string; credentials: NonNullable<Awaited<ReturnType<CredentialResolver>>> };

/**
 * The bucket this space writes to: the first `Connection` for this connector whose credential
 * resolves. Reads take their endpoint from the URI itself, so this lookup exists only for `put`.
 */
const findWriteEndpoint = async ({
  client,
  spaceId,
  resolveCredentials,
}: {
  client: Client;
  spaceId: SpaceId;
  resolveCredentials: CredentialResolver;
}): Promise<WriteEndpoint | undefined> => {
  const space = client.spaces.get(spaceId);
  if (!space) {
    return undefined;
  }

  const connections = await space.db.query(Query.type(Connection.Connection)).run();
  for (const connection of connections) {
    if (connection.connectorId !== S3_CONNECTOR_ID) {
      continue;
    }

    const accessToken = await connection.accessToken.load();
    const credentials = await resolveCredentials({ spaceId, host: accessToken.source });
    if (credentials) {
      return { host: accessToken.source, credentials };
    }

    log.warn('s3 connection has no resolvable credential', { host: accessToken.source });
  }

  return undefined;
};

/**
 * Blob backend storing bytes in an S3-compatible bucket, addressed by `s3://<host>/<key>` URIs.
 *
 * Reads are attempted unsigned when the space holds no credential for the endpoint, so a public
 * bucket renders for a viewer who was never given the writer's keys. Writes always require one.
 *
 * The bucket must allow the app's origin in its CORS policy for `GET`, `HEAD` and `PUT`; without it
 * the browser blocks the request before it is sent and the failure surfaces as an opaque network
 * error rather than a 403.
 */
export const createS3BlobBackend = ({
  client,
  resolveCredentials,
}: {
  client: Client;
  resolveCredentials: CredentialResolver;
}): BlobBackend => {
  const resolve = (uri: string) => {
    const parsed = parseUri(uri);
    invariant(parsed, `not an s3 uri: ${uri}`);
    return parsed;
  };

  const credentialsFor = (spaceId: SpaceId, host: string) => resolveCredentials({ spaceId, host });

  return {
    schemes: [S3_SCHEME],

    put: async ({ spaceId, data, contentType, contentHash }) => {
      // `BlobPutRequest` carries no endpoint, so the destination is the space's own connection.
      const endpoint = await findWriteEndpoint({ client, spaceId, resolveCredentials });
      invariant(endpoint, 'no S3 connection in this space; connect a bucket before uploading');

      const uri = { host: endpoint.host, key: objectKey({ spaceId, contentHash }) };
      await putObject({ uri, data, contentType, contentHash, credentials: endpoint.credentials });
      return { uri: formatUri(uri) };
    },

    get: async ({ spaceId, uri }) => {
      const parsed = resolve(uri);
      return getObject({ uri: parsed, credentials: await credentialsFor(spaceId, parsed.host) });
    },

    has: async ({ spaceId, uri }) => {
      const parsed = resolve(uri);
      return headObject({ uri: parsed, credentials: await credentialsFor(spaceId, parsed.host) });
    },

    getUrl: async ({ spaceId, uri }) => {
      const parsed = resolve(uri);
      return getObjectUrl({ uri: parsed, credentials: await credentialsFor(spaceId, parsed.host) });
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const resolveCredentials = createCredentialResolver({ client });

    const cleanup = client.graph.registerBlobBackend(S3_BACKEND, createS3BlobBackend({ client, resolveCredentials }));
    yield* Effect.addFinalizer(() => Effect.sync(() => cleanup()));

    return Capability.contribute(FileCapabilities.Backend, {
      name: 'S3',
      description: 'Store files in an S3-compatible bucket (Cloudflare R2, AWS S3, MinIO).',
      storage: S3_BACKEND,
    });
  }),
);
