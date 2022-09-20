//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PublicKey } from '@dxos/keys';

/**
 * Validate string keys from url params as party keys.
 *
 * Redirect to the home page if the key is invalid.
 */
export const useSafePartyKey = (hex?: string): PublicKey | undefined => {
  const navigate = useNavigate();
  const [partyKey, setPartyKey] = useState<PublicKey>();

  useEffect(() => {
    if (hex) {
      try {
        setPartyKey(PublicKey.fromHex(hex));
      } catch {
        navigate('/');
      }
    } else {
      setPartyKey(undefined);
    }
  }, [hex]);

  return partyKey;
};
