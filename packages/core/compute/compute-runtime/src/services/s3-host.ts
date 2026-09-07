//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type S3Host } from '@dxos/blob/s3';
import * as Credential from '@dxos/compute/Credential';
import { Database, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';

import { credentialsLayerFromDatabase } from './credentials';

/** `Connection.connectorId` written by plugin-s3's connector; the marker for an S3 connection. */
export const S3_CONNECTOR_ID = 'org.dxos.plugin.s3.connector';

export type S3HostOptions = {
  /** The database for a space, or `undefined` where this host cannot resolve one. */
  getDatabase: (spaceId: SpaceId) => Database.Database | undefined;
  /**
   * Resolves EDGE-custodied tokens. Optional: without it a `MANAGED_ACCESS_TOKEN` cannot be
   * exchanged and yields no credential, which is the correct outcome on a host with no route to
   * EDGE, and better than handing the signer an opaque placeholder as if it were a key.
   */
  accessTokenResolver?: Layer.Layer<Credential.AccessTokenResolver>;
};

/**
 * Binds `@dxos/blob/s3` to a space's database.
 *
 * Lives here rather than in `blob-s3` because it needs `credentialsLayerFromDatabase`, which lives
 * here — reusing it rather than reading `AccessToken` objects directly is what keeps a
 * server-custodied token resolving through EDGE instead of yielding its placeholder. Keeping it out
 * of `blob-s3` also keeps that package free of `@dxos/echo`, so it stays registrable anywhere.
 *
 * Both resolvers take a `Database` rather than a `Client`: the browser has a client and EDGE's
 * `operation-service` does not, and the database is all either lookup needs.
 */
export const createS3Host = ({
  getDatabase,
  accessTokenResolver = Credential.AccessTokenResolver.notAvailable,
}: S3HostOptions): S3Host => {
  const resolveCredentials: S3Host['resolveCredentials'] = async ({ spaceId, host }) => {
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

  const resolveWriteEndpoint: S3Host['resolveWriteEndpoint'] = async (spaceId) => {
    const db = getDatabase(spaceId);
    if (!db) {
      return undefined;
    }

    const connections = await db.query(Query.type(Connection.Connection)).run();
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

  return { resolveCredentials, resolveWriteEndpoint };
};
