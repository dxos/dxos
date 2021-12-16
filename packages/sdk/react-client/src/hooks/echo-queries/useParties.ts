//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { PartyProxy } from '@dxos/client';
import { PublicKey, PublicKeyLike } from '@dxos/crypto';

import { useClient } from '../client';

/**
 * Get a specific Party.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useParty = (partyKey?: PublicKeyLike): PartyProxy | undefined => {
  const client = useClient();
  // TODO(wittjosiah): Not responsive to party updates?
  return partyKey ? client.echo.getParty(PublicKey.from(partyKey)) : undefined;
};

/**
 * Get all Parties available to current user.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useParties = () => {
  const client = useClient();
  const [parties, setParties] = useState<PartyProxy[]>([]);

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
