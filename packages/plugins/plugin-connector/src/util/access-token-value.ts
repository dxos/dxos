//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { type Client } from '@dxos/client';
import { Credential } from '@dxos/compute';
import { accessTokenResolverFromEdge, credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import { Database, Obj } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';

/**
 * The usable value of an {@link AccessToken.AccessToken}, resolved through
 * {@link Credential.CredentialsService} so a server-custodied token is fetched from EDGE and a
 * plain one is read from the object — connectors do not distinguish between the two.
 *
 * Keyed by object id rather than by service: a space can hold several connections to the same
 * provider, and a by-service lookup would pick among them arbitrarily.
 */
export const accessTokenValue = (
  accessToken: AccessToken.AccessToken,
): Effect.Effect<string, never, Credential.CredentialsService> =>
  Effect.map(Credential.CredentialsService.getApiKey({ accessTokenId: accessToken.id }), Redacted.value);

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
