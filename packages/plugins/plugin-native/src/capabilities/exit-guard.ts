//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

import { saveBeforeLeaving, unsavedChangesToast } from '../unsaved-changes.ts';

/**
 * Emitted by the shell when an exit is requested: the tray's Quit, or closing the window outside macOS (where closing
 * hides Composer to the menu bar); not macOS Cmd+Q.
 */
const EXIT_REQUESTED_EVENT = 'composer://exit-requested';

/**
 * Answers the shell's exit request. The shell holds the exit until this module confirms or cancels it,
 * so changes that exist only in this page are saved first; if they cannot be, the exit is cancelled
 * and a toast offers to quit anyway.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const { invokePromise } = yield* Capabilities.OperationInvoker;

    const unlisten = yield* Effect.promise(async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { invoke } = await import('@tauri-apps/api/core');

      return listen(EXIT_REQUESTED_EVENT, async () => {
        let deferred = false;
        try {
          const guards = capabilities.getAll(AppCapabilities.UnsavedChanges);
          if (guards.some((guard) => guard.has())) {
            // Without this the shell exits once its grace period ends, as it does for a page that never answers.
            await invoke('defer_exit');
            deferred = true;
            if (!(await saveBeforeLeaving(guards))) {
              await invoke('cancel_exit');
              await invokePromise(
                LayoutOperation.AddToast,
                unsavedChangesToast('quit', () => void invoke('confirm_exit')),
              );
              return;
            }
          }
          await invoke('confirm_exit');
        } catch (err) {
          log.catch(err);
          // Once deferred, this page holds changes it could not save: stay, and let the next quit ask again.
          await invoke(deferred ? 'cancel_exit' : 'confirm_exit');
        }
      });
    });

    yield* Effect.addFinalizer(() => Effect.sync(() => unlisten()));
    return [];
  }),
);
