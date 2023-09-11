//
// Copyright 2023 DXOS.org
//

import { Shell } from '@dxos/client/services';

import { useClient } from './ClientContext';

/**
 * Helper hook to access the shell.
 */
export const useShell = (): Shell => {
  const client = useClient();
  return client.shell;
};
