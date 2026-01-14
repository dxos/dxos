//
// Copyright 2025 DXOS.org
//

// Based on the frontend-driven dismiss pattern from:
// https://github.com/Jedliu/tauri-template-demo

import { useEffect } from 'react';

import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

/**
 * Get the Tauri window API from the global object.
 * Returns undefined if not running in Tauri.
 */
const getTauriWindow = (): any => {
  const tauri = (globalThis as any).__TAURI__;
  return tauri?.window;
};

/**
 * Get the Tauri core API (invoke) from the global object.
 * Returns undefined if not running in Tauri.
 */
const getTauriCore = (): any => {
  const tauri = (globalThis as any).__TAURI__;
  return tauri?.core;
};

/**
 * Hook to set up spotlight panel dismiss behavior.
 * When running in Tauri popover mode, listens for focus loss and Escape key
 * to dismiss the spotlight panel.
 */
export const useSpotlightDismiss = (isPopover: boolean | undefined) => {
  // Handle blur (click outside) to dismiss spotlight.
  useEffect(() => {
    if (!isPopover || !isTauri()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        const tauriWindow = getTauriWindow();
        const tauriCore = getTauriCore();
        if (!tauriWindow || !tauriCore) {
          return;
        }

        const win = tauriWindow.getCurrentWindow();
        const unlisten = await win.onFocusChanged(async ({ payload }: { payload: boolean }) => {
          if (!payload) {
            await tauriCore.invoke('hide_spotlight');
          }
        });
        cleanup = unlisten;
      } catch (err) {
        log.catch(err);
      }
    };

    void setup();

    return () => {
      cleanup?.();
    };
  }, [isPopover]);

  // Handle Escape key to dismiss spotlight.
  useEffect(() => {
    if (!isPopover || !isTauri()) {
      return;
    }

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopover]);
};
