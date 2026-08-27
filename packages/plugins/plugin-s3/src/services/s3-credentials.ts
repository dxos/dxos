//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { accessTokenResolverFromEdge, credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type S3Credentials } from './s3-client';

export type CredentialResolver = (request: { spaceId: SpaceId; host: string }) => Promise<S3Credentials | undefined>;

export type CredentialResolverOptions = {
  /**
   * The database for a space, or `undefined` where the host cannot resolve one.
   *
   * A database rather than a `Client`, because that is all the lookup needs — and because the hosts
   * that should be able to reach an S3 bucket do not all have a `Client`. EDGE's `operation-service`
   * provides `Database.Service` and has no client at all; taking one here would confine this backend
   * to the browser for no reason beyond the shape of the parameter.
   */
  getDatabase: (spaceId: SpaceId) => Database.Database | undefined;
  /**
   * Resolves EDGE-custodied tokens. Optional: without it a `MANAGED_ACCESS_TOKEN` cannot be
   * exchanged and resolves to no credential, which is the correct outcome on a host with no route
   * to EDGE, and better than handing the opaque placeholder to the signer as if it were a key.
   */
  accessTokenResolver?: Layer.Layer<Credential.AccessTokenResolver>;
};

/**
 * Resolves the key pair for a bucket endpoint from the space that owns the blob.
 *
 * A `BlobBackend` is a plain-promise interface called with a `spaceId`, so it cannot receive a
 * space-scoped `CredentialsService` through the layer graph the way an Operation does. The
 * credentials layer is therefore built per space from that space's own database — reusing
 * `credentialsLayerFromDatabase` rather than reading `AccessToken` objects directly, so a
 * server-custodied token still resolves through EDGE instead of yielding its opaque placeholder.
 *
 * The resolver layer is built once by the caller and shared: it caches by (space, token) and is
 * application-scoped, so rebuilding it per call would throw that cache away. The credential lookup
 * itself is not cached — a rotated key must take effect on the next request, and every call is
 * already dominated by the bucket round-trip.
 */
export const createCredentialResolver = ({
  getDatabase,
  accessTokenResolver = Credential.AccessTokenResolver.notAvailable,
}: CredentialResolverOptions): CredentialResolver => {
  return async ({ spaceId, host }) => {
    const db = getDatabase(spaceId);
    if (!db) {
      return undefined;
    }

    const credential = await EffectEx.runPromise(
      Credential.CredentialsService.getCredential({ service: host }).pipe(
        Effect.provide(credentialsLayerFromDatabase().pipe(Layer.provide(Database.layer(db)))),
        Effect.provide(accessTokenResolver),
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

/** Re-exported so a host with an EDGE route can supply the resolver without importing the runtime. */
export const edgeAccessTokenResolver = accessTokenResolverFromEdge;
