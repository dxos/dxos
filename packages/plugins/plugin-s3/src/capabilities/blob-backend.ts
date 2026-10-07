//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { S3_BACKEND, createS3BlobBackend } from '@dxos/blob/s3';
import { accessTokenResolverFromEdge, createS3Host } from '@dxos/compute-runtime';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';

/**
 * Registers the S3 backend for the browser.
 *
 * The backend itself lives in `@dxos/blob/s3` and its database bindings in `@dxos/compute-runtime`,
 * so the same code serves headless hosts — EDGE's `operation-service` registers it the same way,
 * from a `Database` rather than a `Client`. All this module supplies is the client-shaped way to
 * reach a space's database, plus the EDGE token resolver that a browser can actually reach.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const host = createS3Host({
      getDatabase: (spaceId) => client.spaces.get(spaceId)?.db,
      accessTokenResolver: accessTokenResolverFromEdge(() => client.edge.http),
    });

    const cleanup = client.graph.registerBlobBackend(S3_BACKEND, createS3BlobBackend(host));
    yield* Effect.addFinalizer(() => Effect.sync(() => cleanup()));

    return Capability.contribute(FileCapabilities.Backend, {
      name: 'S3',
      description: 'Store files in an S3-compatible bucket (Cloudflare R2, AWS S3, MinIO).',
      storage: S3_BACKEND,
    });
  }),
);
