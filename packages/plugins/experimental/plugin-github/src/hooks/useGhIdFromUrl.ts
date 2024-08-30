//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

export const useGhIdFromUrl = (ghUrlValue: string) =>
  useMemo<string | null>(() => {
    try {
      const url = new URL(ghUrlValue);
      const [_, owner, repo, type, ...rest] = url.pathname.split('/');
      if (type === 'blob') {
        const [ref, ...pathParts] = rest;
        const path = pathParts.join('/');
        const ext = pathParts[pathParts.length - 1].split('.')[1];
        return ext === 'md' ? `${owner}/${repo}/blob/${ref}/${path}` : null;
      } else if (type === 'issues') {
        const [issueNumberString] = rest;
        return `${owner}/${repo}/issues/${issueNumberString}`;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }, [ghUrlValue]);
