//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Shell, type ShellDisplay } from '@dxos/client';

import { useClient } from './ClientContext';

/**
 * Helper hook to access the shell.
 */
export const useShell = (): Shell => {
  const client = useClient();
  return client.shell;
};

/**
 * Hook to access the shell’s display state.
 */
export const useShellDisplay = (): ShellDisplay => {
  const client = useClient();
  const [display, setDisplay] = useState(client.shell.display);
  useEffect(() => client.shell.onDisplayChange(setDisplay), [client]);
  return display;
};
