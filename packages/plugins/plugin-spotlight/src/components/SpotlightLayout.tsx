//
// Copyright 2025 DXOS.org
//

import './spotlight.css';

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as NavTreeSurface from '@dxos/plugin-navtree/NavTreeSurface';
import { Dialog, ErrorFallback, useAsyncEffect } from '@dxos/react-ui';
import { isTauri } from '@dxos/util';

import { useSpotlightState } from './useSpotlightState.ts';

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
  const { state, updateState } = useSpotlightState();
  const dialogContent = state.dialogContent ?? { component: NavTreeSurface.COMMANDS_DIALOG };

  // Reset state and autofocus when the popover window gains focus.
  useAsyncEffect(async () => {
    if (!isTauri()) {
      return;
    }

    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();

    const unlisten = await win.onFocusChanged(({ payload }: { payload: boolean }) => {
      if (payload) {
        updateState(() => ({
          dialogOpen: true,
          dialogContent: { component: NavTreeSurface.COMMANDS_DIALOG },
        }));
        requestAnimationFrame(() => focusSearchInput());
      }
    });

    return () => unlisten();
  }, [updateState]);

  return (
    <div className='grid inset-0 overflow-hidden' data-spotlight>
      <Dialog.Root open={state.dialogOpen} modal={false}>
        <Surface.Surface type={AppSurface.Dialog} data={dialogContent} limit={1} fallback={ErrorFallback} />
      </Dialog.Root>
    </div>
  );
};
