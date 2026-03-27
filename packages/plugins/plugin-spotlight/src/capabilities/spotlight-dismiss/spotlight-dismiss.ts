//
// Copyright 2025 DXOS.org
//

// Based on the frontend-driven dismiss pattern from:
// https://github.com/Jedliu/tauri-template-demo

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

/**
 * Capability that sets up spotlight panel dismiss behavior.
 * Listens for focus loss and Escape key to dismiss the spotlight panel.
 */
export default Capability.makeModule(() =>
  Effect.promise(async () => {
    if (!isTauri()) {
      return [];
    }

    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const { invoke } = await import('@tauri-apps/api/core');
    const win = getCurrentWindow();

    // Hide spotlight when the panel loses focus.
    let focusCleanup: (() => void) | undefined;
    try {
      focusCleanup = await win.onFocusChanged(async ({ payload }: { payload: boolean }) => {
        if (!payload) {
          await invoke('hide_spotlight');
        }
      });
    } catch (err) {
      log.catch(err);
    }

    // Escape key listener.
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        try {
          await invoke('hide_spotlight');
        } catch (err) {
          log.catch(err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        focusCleanup?.();
        window.removeEventListener('keydown', handleKeyDown);
      }),
    );
  }),
);
