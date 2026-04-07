//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoOperation } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { meta } from '#meta';
import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof UndoOperation.ShowUndo> = UndoOperation.ShowUndo.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const historyTracker = yield* Capability.get(Capabilities.HistoryTracker);

      const newUndoId = `show-undo-${Date.now()}`;
      // TODO(wittjosiah): Support undoing further back than the last action.
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => {
        const filteredToasts = state.currentUndoId
          ? state.toasts.filter((toast) => toast.id !== state.currentUndoId)
          : state.toasts;

        const toast: LayoutOperation.Toast = {
          id: newUndoId,
          title: input.message ?? ['undo-available.label', { ns: meta.id }],
          duration: 10_000,
          actionLabel: ['undo-action.label', { ns: meta.id }],
          actionAlt: ['undo-action.alt', { ns: meta.id }],
          closeLabel: ['undo-close.label', { ns: meta.id }],
          onAction: () => historyTracker.undoPromise(),
        };

        return {
          ...state,
          currentUndoId: newUndoId,
          toasts: [...filteredToasts, toast],
        };
      });
    }),
  ),
);

export default handler;
