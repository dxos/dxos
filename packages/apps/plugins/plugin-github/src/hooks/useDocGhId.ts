//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { log } from '@dxos/log';

import { type GhIdentifier } from '../props';

export const useDocGhId = (keys: { source?: string; id?: string }[]) => {
  return useMemo<GhIdentifier | null>(() => {
    try {
      const key = keys?.find((key) => key.source === 'github.com');
      const [owner, repo, type, ...rest] = key?.id?.split('/') ?? [];
      if (type === 'issues') {
        return {
          owner,
          repo,
          issueNumber: parseInt(rest[0], 10),
        };
      } else if (type === 'blob') {
        const [ref, ...pathParts] = rest;
        return {
          owner,
          repo,
          ref,
          path: pathParts.join('/'),
        };
      } else {
        return null;
      }
    } catch (err) {
      log.catch(err);
      return null;
    }
  }, [keys]);
};
