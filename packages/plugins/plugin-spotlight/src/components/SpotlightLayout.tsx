//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Dialog, ErrorFallback } from '@dxos/react-ui';
import { isTauri } from '@dxos/util';

import { useSpotlightState } from './useSpotlightState';

/** Commands dialog surface identifier (from plugin-navtree). */
const COMMANDS_DIALOG = 'org.dxos.plugin.navtree.commands-dialog';

/**
 * Spotlight layout renders the commands dialog directly as the main content.
 * Wraps in a permanently-open, non-modal Dialog.Root to provide the Radix context
 * that CommandsDialogContent expects.
 *
 * CSS overrides force the Dialog.Content to fill the popover window rather than
 * rendering as a centered fixed dialog with a max-width constraint.
 */
/** Focus the search input inside the spotlight dialog. */
const focusSearchInput = () => {
  const input = document.querySelector<HTMLInputElement>('[data-spotlight] input');
  if (input) {
    input.focus();
    input.select();
  }
};

export const SpotlightLayout = () => {
  const { state } = useSpotlightState();
  const dialogContent = state.dialogContent ?? { component: COMMANDS_DIALOG };

  // Autofocus the search input when the popover window gains focus.
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const tauriWindow = (globalThis as any).__TAURI__?.window;
    if (!tauriWindow) {
      return;
    }

    let cleanup: (() => void) | undefined;
    tauriWindow.getCurrentWindow().onFocusChanged(({ payload }: { payload: boolean }) => {
      if (payload) {
        requestAnimationFrame(() => focusSearchInput());
      }
    }).then((unlisten: () => void) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <div className='h-screen w-screen overflow-hidden' data-spotlight>
      <Dialog.Root open={state.dialogOpen} modal={false}>
        <Surface.Surface role='dialog' data={dialogContent} limit={1} fallback={ErrorFallback} />
      </Dialog.Root>
    </div>
  );
};
