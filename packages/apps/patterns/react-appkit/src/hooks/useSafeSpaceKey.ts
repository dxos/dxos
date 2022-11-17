//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

/**
 * Validate string keys from url params as space keys.
 *
 * Redirect to the home page if the key is invalid.
 */
export const useSafeSpaceKey = (hex?: string, onFailure?: () => void): PublicKey | undefined => {
  const [spaceKey, setSpaceKey] = useState<PublicKey>();

  useEffect(() => {
    if (hex) {
      try {
        setSpaceKey(PublicKey.fromHex(hex));
      } catch {
        log.warn('invalid space key', { hex });
        onFailure?.();
      }
    } else {
      setSpaceKey(undefined);
    }
  }, [hex]);

  return spaceKey;
};
