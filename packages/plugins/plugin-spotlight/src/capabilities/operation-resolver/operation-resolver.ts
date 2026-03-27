//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';

import { type SpotlightState, SpotlightState as SpotlightStateCapability } from '../../types';

/**
 * Get the Tauri core API (invoke) from the global object.
 */
const getTauriCore = (): any => {
  const tauri = (globalThis as any).__TAURI__;
  return tauri?.core;
};

/**
 * Dismiss the spotlight panel.
 * The Rust hide_spotlight command calls resign_key_window() + hide(),
 * which lets macOS naturally activate the previously focused window.
 */
const dismissSpotlight = async () => {
  try {
    const tauriCore = getTauriCore();
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
    log.info('Forwarded operation to main window', { operation, payload });
  } catch (err) {
    log.catch(err);
  }

  await dismissSpotlight();
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(SpotlightStateCapability);

    const updateState = (fn: (current: SpotlightState) => SpotlightState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    };

    return Capability.contributes(Capabilities.OperationResolver, [
      //
      // SetLayoutMode - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.SetLayoutMode,
        handler: () => Effect.void,
      }),

      //
      // UpdateSidebar - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdateSidebar,
        handler: () => Effect.void,
      }),

      //
      // UpdateComplementary - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdateComplementary,
        handler: () => Effect.void,
      }),

      //
      // UpdateDialog - Updates content or dismisses the spotlight when state is false.
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdateDialog,
        handler: Effect.fnUntraced(function* (input) {
          if (input.subject) {
            updateState((state) => ({
              ...state,
              dialogContent: { component: input.subject!, props: input.props },
            }));
          }
        }),
      }),

      //
      // UpdatePopover - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdatePopover,
        handler: () => Effect.void,
      }),

      //
      // SwitchWorkspace - Forward to main window without dismissing.
      // The Open handler that follows will handle dismissal.
      //
      OperationResolver.make({
        operation: LayoutOperation.SwitchWorkspace,
        handler: Effect.fnUntraced(function* (input) {
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
      }),

      //
      // RevertWorkspace - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.RevertWorkspace,
        handler: () => Effect.void,
      }),

      //
      // Open - Forward to main window and dismiss spotlight.
      //
      OperationResolver.make({
        operation: LayoutOperation.Open,
        handler: Effect.fnUntraced(function* (input) {
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
      }),

      //
      // Close - Dismiss spotlight.
      //
      OperationResolver.make({
        operation: LayoutOperation.Close,
        handler: Effect.fnUntraced(function* () {
          yield* Effect.promise(() => dismissSpotlight());
        }),
      }),

      //
      // Set - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.Set,
        handler: () => Effect.void,
      }),

      //
      // ScrollIntoView - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.ScrollIntoView,
        handler: () => Effect.void,
      }),

      //
      // Expose - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.Expose,
        handler: () => Effect.void,
      }),

      //
      // AddToast - No-op.
      //
      OperationResolver.make({
        operation: LayoutOperation.AddToast,
        handler: () => Effect.void,
      }),

    ]);
  }),
);
