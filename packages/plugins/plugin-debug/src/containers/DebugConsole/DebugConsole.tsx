//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { IconButton, Panel, SystemIconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { Terminal, type TerminalApi } from '@dxos/react-ui-terminal';

import { meta } from '#meta';

import { createDebugCli } from './cli';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const BANNER = `${BOLD}Debug console${RESET}\n${DIM}snapshot · plugins · enable · disable · ops · invoke · eval · port — "help" for details.${RESET}`;

export type DebugConsoleProps = {
  /** Rendered as a close button in the toolbar when provided (the popover host closes itself). */
  onClose?: () => void;
};

/**
 * The debug console: the introspection surface an agent drives over the debug port (operations,
 * snapshot, plugin management, eval), as an interactive Effect-CLI terminal.
 */
export const DebugConsole = ({ onClose }: DebugConsoleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const apiRef = useRef<TerminalApi | null>(null);
  const lastResultRef = useRef('');
  const cli = useMemo(
    () =>
      createDebugCli(manager, {
        onResult: (text) => {
          lastResultRef.current = text;
        },
      }),
    [manager],
  );

  const handleClear = useCallback(() => {
    apiRef.current?.clear();
    apiRef.current?.focus();
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar size='sm'>
        <Toolbar.Root density='sm' classNames='p-0.5'>
          <IconButton
            variant='ghost'
            iconOnly
            icon='ph--eraser--regular'
            label={t('console.clear.label')}
            onClick={handleClear}
          />
          <SystemIconButton.Clipboard
            variant='ghost'
            iconOnly
            label={t('console.copy.label')}
            onCopy={() => lastResultRef.current}
          />
          <div role='none' className='grow' />
          {onClose && <SystemIconButton.Close variant='ghost' iconOnly onClick={onClose} />}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Terminal
          command={cli.command}
          layer={cli.layer}
          name='debug'
          banner={BANNER}
          apiRef={apiRef}
          // Fixed grid so a content-sized host (the status-bar popover) hugs the terminal exactly.
          dimensions={{ cols: 100, rows: 24 }}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

DebugConsole.displayName = 'DebugConsole';
