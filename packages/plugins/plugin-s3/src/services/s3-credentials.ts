//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { accessTokenResolverFromEdge, credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type S3Credentials } from './s3-client';

export type CredentialResolver = (request: { spaceId: SpaceId; host: string }) => Promise<S3Credentials | undefined>;

/**
 * Resolves the key pair for a bucket endpoint from the space that owns the blob.
 *
 * A `BlobBackend` is a plain-promise interface called with a `spaceId`, so it cannot receive a
 * space-scoped `CredentialsService` through the layer graph the way an Operation does. The
 * credentials layer is therefore built per space from that space's own database — reusing
 * `credentialsLayerFromDatabase` rather than reading `AccessToken` objects directly, so a
 * server-custodied token still resolves through EDGE instead of yielding its opaque placeholder.
 *
 * The EDGE resolver layer is built once and shared: it caches by (space, token) and is
 * application-scoped, so rebuilding it per call would throw that cache away. The credential lookup
 * itself is not cached — a rotated key must take effect on the next request, and every call is
 * already dominated by the bucket round-trip.
 */
export const createCredentialResolver = ({ client }: { client: Client }): CredentialResolver => {
  const resolverLayer = accessTokenResolverFromEdge(() => client.edge.http);

  return async ({ spaceId, host }) => {
    const space = client.spaces.get(spaceId);
    if (!space) {
      return undefined;
    }

    const credential = await EffectEx.runPromise(
      Credential.CredentialsService.getCredential({ service: host }).pipe(
        Effect.provide(credentialsLayerFromDatabase().pipe(Layer.provide(Database.layer(space.db)))),
        Effect.provide(resolverLayer),
        // `getCredential` dies rather than failing when no token matches; an absent credential is
        // the ordinary case for a public bucket, so it resolves to `undefined` instead of throwing.
        Effect.catchDefect(() => Effect.succeed<Credential.ServiceCredential | undefined>(undefined)),
      ),
    );

    if (!credential?.apiKey || !credential.account) {
      log('no s3 credential for endpoint', { spaceId, host });
      return undefined;
    }

    // `account` holds the access key id (a non-secret identifier); `apiKey` the secret access key.
    return { accessKeyId: credential.account, secretAccessKey: credential.apiKey };
  };
};
