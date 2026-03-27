//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { SpotlightState } from '../types';

/**
 * Dismiss the spotlight panel.
 */
const dismissSpotlight = async () => {
  try {
    const tauriCore = (globalThis as any).__TAURI__?.core;
    if (tauriCore) {
      await tauriCore.invoke('hide_spotlight');
    }
  } catch (err) {
    log.catch(err);
  }
};

/**
 * Forward an operation to the main window via Tauri event, then dismiss the spotlight.
 */
const forwardToMainWindow = async (operation: string, payload?: Record<string, any>) => {
  try {
    const { emitTo } = await import('@tauri-apps/api/event');
    await emitTo('main', 'spotlight:invoke', { operation, payload });
  } catch (err) {
    log.catch(err);
  }

  await dismissSpotlight();
};

// Debounced dismiss: commands dialog calls UpdateDialog({ state: false }) before running
// the selected action via setTimeout. If the action opens a new dialog (e.g., search),
// we cancel the pending dismiss so the content can switch instead.
let dismissTimeout: ReturnType<typeof setTimeout> | undefined;

const scheduleDismiss = () => {
  dismissTimeout = setTimeout(() => {
    dismissTimeout = undefined;
    void dismissSpotlight();
  }, 100);
};

const cancelDismiss = () => {
  if (dismissTimeout !== undefined) {
    clearTimeout(dismissTimeout);
    dismissTimeout = undefined;
  }
};

export const SpotlightOperationHandlerSet = OperationHandlerSet.make(
  LayoutOperation.SetLayoutMode.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.UpdateSidebar.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.UpdateComplementary.pipe(Operation.withHandler(() => Effect.void)),

  LayoutOperation.UpdateDialog.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        if (input.subject) {
          cancelDismiss();
          yield* Capabilities.updateAtomValue(SpotlightState, (state) => ({
            ...state,
            dialogContent: { component: input.subject!, props: input.props },
          }));
        } else if (input.state === false) {
          scheduleDismiss();
        }
      }),
    ),
  ),

  LayoutOperation.UpdatePopover.pipe(Operation.withHandler(() => Effect.void)),

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

  LayoutOperation.RevertWorkspace.pipe(Operation.withHandler(() => Effect.void)),

  LayoutOperation.Open.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        yield* Effect.promise(() =>
          forwardToMainWindow('open', {
            subject: input.subject,
            state: input.state,
            variant: input.variant,
            workspace: input.workspace,
            scrollIntoView: input.scrollIntoView,
          }),
        );
      }),
    ),
  ),

  LayoutOperation.Close.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        yield* Effect.promise(() => dismissSpotlight());
      }),
    ),
  ),

  LayoutOperation.Set.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.ScrollIntoView.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.Expose.pipe(Operation.withHandler(() => Effect.void)),
  LayoutOperation.AddToast.pipe(Operation.withHandler(() => Effect.void)),
);
