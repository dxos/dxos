//
// Copyright 2025 DXOS.org
//

// Based on the frontend-driven dismiss pattern from:
// https://github.com/Jedliu/tauri-template-demo

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

/**
 * Get the Tauri window API from the global object.
 */
const getTauriWindow = (): any => {
  const tauri = (globalThis as any).__TAURI__;
  return tauri?.window;
};

/**
 * Get the Tauri core API (invoke) from the global object.
 */
const getTauriCore = (): any => {
  const tauri = (globalThis as any).__TAURI__;
  return tauri?.core;
};

export type SpotlightDismissOptions = {
  /** Whether running in popover window context. */
  isPopover?: boolean;
};

/**
 * Capability that sets up spotlight panel dismiss behavior.
 * When running in Tauri popover mode, listens for focus loss and Escape key
 * to dismiss the spotlight panel. Runs at startup before React renders.
 */
export default Capability.makeModule(({ isPopover = false }: SpotlightDismissOptions = {}) =>
  Effect.promise(async () => {
    if (!isPopover || !isTauri()) {
      return [];
    }

    // Set up focus listener.
    let focusCleanup: (() => void) | undefined;
    try {
      const tauriWindow = getTauriWindow();
      const tauriCore = getTauriCore();
      if (tauriWindow && tauriCore) {
        const win = tauriWindow.getCurrentWindow();
        focusCleanup = await win.onFocusChanged(async ({ payload }: { payload: boolean }) => {
          if (!payload) {
            await tauriCore.invoke('hide_spotlight');
          }
        });
      }
    } catch (err) {
      log.catch(err);
    }

    // Set up Escape key listener.
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        try {
          const tauriCore = getTauriCore();
          if (tauriCore) {
            await tauriCore.invoke('hide_spotlight');
          }
        } catch (err) {
          log.catch(err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.sync(() => {
        focusCleanup?.();
        window.removeEventListener('keydown', handleKeyDown);
      }),
    );
  }),
);
