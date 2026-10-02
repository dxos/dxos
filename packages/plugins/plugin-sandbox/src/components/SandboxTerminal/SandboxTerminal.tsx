//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { useCallback, useState } from 'react';

import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type XtermAttach, XtermView } from '@dxos/react-ui-terminal';

import { meta } from '#meta';

import { type TerminalEndpoint } from '../../services/SandboxClient.ts';
import { type TerminalStatus, runTerminal } from '../../services/terminal-connection.ts';

export type SandboxTerminalProps = {
  role?: string;
  /** Mints the endpoint for one connection; called again for every reconnect. */
  open: (size: { cols: number; rows: number }) => Effect.Effect<TerminalEndpoint, unknown>;
};

/**
 * A terminal attached to a sandbox's persistent shell. Unmounting closes the socket, not the shell:
 * the next mount resumes it, scrollback included.
 */
export const SandboxTerminal = ({ role, open }: SandboxTerminalProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [status, setStatus] = useState<TerminalStatus>('connecting');

  const attach = useCallback<XtermAttach>(
    (xterm) => {
      const fiber = Effect.runFork(runTerminal(xterm, open, setStatus));
      return () => Effect.runPromise(Fiber.interrupt(fiber));
    },
    [open],
  );

  // No ScrollArea: xterm owns its own viewport and scrollback.
  return (
    <Panel.Root role={role} classNames='dx-expand'>
      <Panel.Toolbar>
        <Toolbar.Root>
          <span className='text-sm text-description' data-testid='sandbox.terminal.status'>
            {t(`terminal-${status}.message`)}
          </span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <XtermView attach={attach} />
      </Panel.Content>
    </Panel.Root>
  );
};
