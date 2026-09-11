//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Placeholder } from '@dxos/devtools';
import { useClient } from '@dxos/react-client';
import { Panel } from '@dxos/react-ui';
import { Terminal } from '@dxos/react-ui-terminal';

import { useCliApp } from './useCliApp.ts';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const BANNER = `${BOLD}DXOS CLI${RESET}\n${DIM}The dx commands, running against this client. Type "help" for the list.${RESET}`;

/**
 * Runs the `dx` CLI against the client backing this app.
 *
 * The command tree is assembled from the commands the installed plugins contribute, and it and its
 * services are built once per client, so state the handlers hold survives between commands the way
 * it does in a long-lived shell.
 */
export const CliPanel = () => {
  const client = useClient();
  const cli = useCliApp(client);

  // No ScrollArea: xterm owns its own viewport and scrollback.
  return (
    <Panel.Root>
      <Panel.Content>
        {cli ? (
          <Terminal command={cli.command} layer={cli.layer} name='dx' banner={BANNER} />
        ) : (
          <Placeholder label='No commands' />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

CliPanel.displayName = 'CliPanel';
