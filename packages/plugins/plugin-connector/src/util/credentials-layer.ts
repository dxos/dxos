//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { type Credential } from '@dxos/compute';
import { accessTokenResolverFromEdge, credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import { Database } from '@dxos/echo';

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
