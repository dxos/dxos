//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { S3_BACKEND, createS3BlobBackend } from '@dxos/blob/s3';
import { accessTokenResolverFromEdge, createS3Host } from '@dxos/compute-runtime';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';

export const BlobBackend = Capability.makeModule(
  'BlobBackend',
  {
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    // The file plugin's start, not this plugin's own: it contributes no surface, so nothing would
    // ever fire an own-start event for it.
    activatesOn: FileEvents.Start,
  },
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
