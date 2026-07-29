//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { type Credential } from '@dxos/compute';
import { accessTokenResolverFromEdge, credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import { Database, Obj } from '@dxos/echo';

/**
 * The credentials layer for connector hooks, which run outside the operation layer graph. Resolution
 * goes over authenticated HTTP because these run on the client, where an identity is available.
 */
export const clientCredentialsLayer = (
  client: Client,
  db: Database.Database,
): Layer.Layer<Credential.CredentialsService> =>
  credentialsLayerFromDatabase().pipe(
    Layer.provide(Database.layer(db)),
    Layer.provide(accessTokenResolverFromEdge(() => client.edge.http)),
  );

/** The credentials layer for an object's own space. */
export const credentialsLayerForObject = (
  client: Client,
  object: Obj.Unknown,
): Layer.Layer<Credential.CredentialsService> | undefined => {
  const db = Obj.getDatabase(object);
  return db ? clientCredentialsLayer(client, db) : undefined;
};
