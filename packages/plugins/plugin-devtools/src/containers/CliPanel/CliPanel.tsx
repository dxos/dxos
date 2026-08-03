//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { useClient } from '@dxos/react-client';
import { Panel } from '@dxos/react-ui';
import { Terminal } from '@dxos/react-ui-terminal';

import { createCliApp } from './cli';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const BANNER = `${BOLD}DXOS CLI${RESET}\n${DIM}The dx commands, running against this client. Type "help" for the list.${RESET}`;

/**
 * Runs the `dx` CLI against the client backing this app.
 *
 * The command tree and its services are built once per client, so state the handlers hold survives
 * between commands the way it does in a long-lived shell.
 */
export const CliPanel = () => {
  const client = useClient();
  const manager = usePluginManager();
  const { command, layer } = useMemo(() => createCliApp(client, manager), [client, manager]);

  // No ScrollArea: xterm owns its own viewport and scrollback.
  return (
    <Panel.Root>
      <Panel.Content>
        <Terminal command={command} layer={layer} name='dx' banner={BANNER} />
      </Panel.Content>
    </Panel.Root>
  );
};

CliPanel.displayName = 'CliPanel';
