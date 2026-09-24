//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { getEnvString } from '@dxos/config';
import { useClient } from '@dxos/react-client';

import { ACCOUNT_PROFILE_URL } from '../constants.ts';

/**
 * The account profile page and an opener for it. Served from a different origin to the app, so the
 * window is opened with `noopener`.
 */
export const useAccountUrl = (): { accountUrl: string; openAccountPage: () => void } => {
  const client = useClient();
  const accountUrl = getEnvString(client.config, 'DX_ACCOUNT_URL') ?? ACCOUNT_PROFILE_URL;
  const openAccountPage = useCallback(() => {
    window.open(accountUrl, '_blank', 'noopener');
  }, [accountUrl]);

  return { accountUrl, openAccountPage };
};
