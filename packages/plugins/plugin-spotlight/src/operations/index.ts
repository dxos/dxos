//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { SpotlightState } from '../types';

const DISMISS_DEBOUNCE_MS = 100;

export const SpotlightOperationHandlerSet = OperationHandlerSet.make(
  // UpdateDialog — switch content or schedule dismiss.
  LayoutOperation.UpdateDialog.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        /* NOTE: The commands dialog (CommandsDialogContent) always calls UpdateDialog({ state: false })
         * BEFORE running the selected action via setTimeout. If the action switches the spotlight
         * to a different dialog (e.g., search or quick entry), it will call UpdateDialog({ subject })
         * shortly after. Without the debounce, the spotlight would dismiss before the content switch
         * arrives. The delay gives the action time to fire; if a new subject arrives, the pending
         * dismiss is cancelled.
         */
        if (input.subject) {
          // Cancel any pending dismiss and switch content.
          yield* Capabilities.updateAtomValue(SpotlightState, (state) => {
            if (state.dismissTimeout !== undefined) {
              clearTimeout(state.dismissTimeout);
            }
            return {
              ...state,
              dismissTimeout: undefined,
              dialogContent: { component: input.subject!, props: input.props },
            };
          });
        } else if (input.state === false) {
          // Schedule dismiss after a short delay.
          yield* Capabilities.updateAtomValue(SpotlightState, (state) => {
            if (state.dismissTimeout !== undefined) {
              clearTimeout(state.dismissTimeout);
            }
            return {
              ...state,
              dismissTimeout: setTimeout(async () => {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('hide_spotlight');
              }, DISMISS_DEBOUNCE_MS),
            };
          });
        }
      }),
    ),
  ),

  // Open — forward to main window and dismiss.
  LayoutOperation.Open.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        yield* Effect.promise(async () => {
          try {
            const { emitTo } = await import('@tauri-apps/api/event');
            await emitTo('main', 'spotlight:invoke', {
              operation: 'open',
              payload: {
                subject: input.subject,
                state: input.state,
                variant: input.variant,
                workspace: input.workspace,
                scrollIntoView: input.scrollIntoView,
              },
            });
          } catch (err) {
            log.catch(err);
          }

          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('hide_spotlight');
        });
      }),
    ),
  ),

  // SwitchWorkspace — forward to main window without dismissing.
  LayoutOperation.SwitchWorkspace.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        yield* Effect.promise(async () => {
          try {
            const { emitTo } = await import('@tauri-apps/api/event');
            await emitTo('main', 'spotlight:invoke', {
              operation: 'switch-workspace',
              payload: { subject: input.subject },
            });
          } catch (err) {
            log.catch(err);
          }
        });
      }),
    ),
  ),

  // Close — dismiss spotlight.
  LayoutOperation.Close.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        yield* Effect.promise(async () => {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('hide_spotlight');
        });
      }),
    ),
  ),

  // No-ops.
  LayoutOperation.SetLayoutMode.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.UpdateSidebar.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.UpdateComplementary.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.UpdatePopover.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.RevertWorkspace.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.Set.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.ScrollIntoView.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.Expose.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.AddToast.pipe(Operation.withHandler(() => Effect.void)),
);
