//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren, useEffect, useState } from 'react';

import { useClient } from '@dxos/react-client';

import { ItemType } from '../data';

export const Initializer: FC<PropsWithChildren> = ({ children }) => {
  const client = useClient();
  // TODO(burdon): [API]: get() here is strange; should be natural like client.spaces.default?
  const [identity, setIdentity] = useState(client.halo.identity.get());
  useEffect(() => {
    try
    client.spaces.default.db.schemaRegistry
      client.addSchema(ItemType);
    } catch (err) {
      // TODO(burdon): [API]: Not idempotent.
    }

    if (!identity) {
      setTimeout(async () => {
        // TODO(burdon): [API]: Need better start-up API.
        // TODO(burdon): [API]: Race condition with identity not set.
        //  Should through API-level error, not: "Error: invariant violation:"
        await client.halo.createIdentity({ displayName: 'Test User' });
        await client.spaces.isReady.wait();
        setIdentity(client.halo.identity.get());
      });
    }
  }, []);

  if (!identity) {
    return null;
  }

  return <>{children}</>;
};
