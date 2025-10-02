//
// Copyright 2022 DXOS.org
//

import type { Client } from '@dxos/client';

import { type IdentityOptions } from '../segment';

export type IPData = {
  city: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

// TODO(wittjosiah): Improve privacy of telemetry identifiers.
//  - Identifier should be generated client-side with no attachment to identity.
//  - Identifier can then be reset by user.
//  - Identifier can be synced via HALO to allow for correlation of events bewteen devices.
//  - Identifier should also be stored outside of HALO such that it is available immediately on startup.
export const getTelemetryIdentifier = (client: Client): string | undefined => {
  if (!client?.initialized) {
    return undefined;
  }

  const identity = client.halo.identity.get();
  if (identity) {
    return identity.did;
  }

  return undefined;
};

export const getTelemetryIdentity = (client: Client): IdentityOptions => {
  const did = getTelemetryIdentifier(client);
  return { did };
};
