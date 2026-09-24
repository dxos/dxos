//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';

import { type BlobBackend } from '../backend.ts';
import { S3_SCHEME } from './constants.ts';
import { type S3Credentials, getObject, getObjectUrl, headObject, putObject } from './s3-client.ts';
import { formatUri, objectKey, parseUri } from './s3-uri.ts';

/**
 * How the host answers the two questions this backend cannot answer itself.
 *
 * Both are supplied rather than derived because they need a space's database, and the hosts that
 * should be able to reach a bucket disagree about how to get one: the browser has a `Client`, while
 * EDGE's `operation-service` has only `Database.Service`. Keeping both out of this package is what
 * makes the backend registrable anywhere.
 */
export type S3Host = {
  /** The key pair for a bucket endpoint, or `undefined` to attempt an unsigned (public) read. */
  resolveCredentials: (request: { spaceId: SpaceId; host: string }) => Promise<S3Credentials | undefined>;
  /**
   * The bucket a space writes to. Reads take their endpoint from the URI, so this exists only for
   * `put` — `BlobPutRequest` carries no endpoint of its own.
   */
  resolveWriteEndpoint: (spaceId: SpaceId) => Promise<{ host: string; credentials: S3Credentials } | undefined>;
};

/**
 * Blob backend storing bytes in an S3-compatible bucket, addressed by `s3://<host>/<key>` URIs.
 *
 * Reads are attempted unsigned when the space holds no credential for the endpoint, so a public
 * bucket renders for a viewer who was never given the writer's keys. Writes always require one.
 *
 * The bucket must allow the app's origin in its CORS policy for `PUT` and for any programmatic
 * read; rendering does not need it, since a presigned URL in an `<img>` is not CORS-gated. In a
 * headless host CORS does not apply at all.
 */
export const createS3BlobBackend = ({ resolveCredentials, resolveWriteEndpoint }: S3Host): BlobBackend => {
  const resolve = (uri: string) => {
    const parsed = parseUri(uri);
    invariant(parsed, `not an s3 uri: ${uri}`);
    return parsed;
  };

  return {
    schemes: [S3_SCHEME],

    put: async ({ spaceId, data, contentType, contentHash }) => {
      const endpoint = await resolveWriteEndpoint(spaceId);
      invariant(endpoint, 'no S3 connection in this space; connect a bucket before uploading');

      const uri = { host: endpoint.host, key: objectKey({ spaceId, contentHash }) };
      await putObject({ uri, data, contentType, contentHash, credentials: endpoint.credentials });
      return { uri: formatUri(uri) };
    },

    get: async ({ spaceId, uri }) => {
      const parsed = resolve(uri);
      return getObject({ uri: parsed, credentials: await resolveCredentials({ spaceId, host: parsed.host }) });
    },

    has: async ({ spaceId, uri }) => {
      const parsed = resolve(uri);
      return headObject({ uri: parsed, credentials: await resolveCredentials({ spaceId, host: parsed.host }) });
    },

    getUrl: async ({ spaceId, uri }) => {
      const parsed = resolve(uri);
      return getObjectUrl({ uri: parsed, credentials: await resolveCredentials({ spaceId, host: parsed.host }) });
    },
  };
};
