//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PublicKey } from '@dxos/protocols';

/**
 * Validate string keys from url params as space keys.
 *
 * Redirect to the home page if the key is invalid.
 */
export const useSafeSpaceKey = (hex?: string): PublicKey | undefined => {
  const navigate = useNavigate();
  const [spaceKey, setSpaceKey] = useState<PublicKey>();

  useEffect(() => {
    if (hex) {
      try {
        setSpaceKey(PublicKey.fromHex(hex));
      } catch {
        navigate('/');
      }
    } else {
      setSpaceKey(undefined);
    }
  }, [hex]);

  return spaceKey;
};
