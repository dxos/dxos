//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { IconButton, Panel, SystemIconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { Terminal, type TerminalApi } from '@dxos/react-ui-terminal';

import { meta } from '#meta';

import { createDebugCli } from './cli.ts';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/** Sizes a host that has no size of its own; a host with a definite size passes `fit` instead. */
const FIXED_GRID = { cols: 100, rows: 24 };

const BANNER = `${BOLD}Debug console${RESET}\n${DIM}snapshot · plugins · enable · disable · ops · invoke · eval · port — "help" for details.${RESET}`;

export type DebugConsoleProps = {
  /** Rendered as a close button in the toolbar when provided (the popover host closes itself). */
  onClose?: () => void;
  /** Fits the terminal to its container; without it the fixed grid sizes a content-sized host. */
  fit?: boolean;
};

/**
 * The debug console: the introspection surface an agent drives over the debug port (operations,
 * snapshot, plugin management, eval), as an interactive Effect-CLI terminal.
 */
export const DebugConsole = ({ onClose, fit }: DebugConsoleProps) => {
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
      <Panel.Content>
        <Terminal
          ref={apiRef}
          command={cli.command}
          layer={cli.layer}
          name='debug'
          banner={BANNER}
          dimensions={fit ? undefined : FIXED_GRID}
        />
      </Panel.Content>
      <Panel.Statusbar asChild>
        <Toolbar.Root classNames='bg-transparent'>
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
          <Toolbar.Separator />
          {onClose && <SystemIconButton.Close variant='ghost' iconOnly onClick={onClose} />}
        </Toolbar.Root>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

DebugConsole.displayName = 'DebugConsole';
