//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import type * as Variant from '@dxos/plugin-studio/Variant';

import { loadTakeData } from '../recorder/index.ts';

/**
 * A playable URL for a take: its bytes read into an object URL this hook owns, and revokes when the take changes or
 * the component unmounts - a URL another component might revoke would stop the player mid-take.
 */
export const useTakeUrl = (take: Variant.Variant | undefined): string | undefined => {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    setUrl(undefined);
    if (!take) {
      return;
    }
    let cancelled = false;
    let created: string | undefined;
    void loadTakeData(take)
      .then((data) => {
        if (!cancelled && data) {
          created = URL.createObjectURL(data);
          setUrl(created);
        }
      })
      .catch((err) => log.catch(err));
    return () => {
      cancelled = true;
      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [take?.id]);
  return url;
};
