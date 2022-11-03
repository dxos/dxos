//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Party } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Get a specific Party.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useParty = (spaceKey?: PublicKeyLike): Party | undefined => {
  const parties = useParties();
  return parties.find((party) => spaceKey && party.key.equals(spaceKey));
};

/**
 * Get all Parties available to current user.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useParties = () => {
  const client = useClient();
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    const result = client.echo.queryParties();
    setParties(result.value);

    const unsubscribe = result.subscribe(() => {
      setParties(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return parties;
};
