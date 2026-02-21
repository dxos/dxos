//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { Capability } from '../core';

import { Label } from './translations';

const UNDO_NAMESPACE = 'dxos.org/app-framework/undo';

/**
 * Operations related to undo/history functionality.
 */
export namespace UndoOperation {
  /**
   * Show an undo toast notification.
   * Fired by HistoryTracker when an undoable operation is tracked.
   */
  export const ShowUndo = Operation.make({
    meta: {
      key: `${UNDO_NAMESPACE}/operation/show-undo`,
      name: 'Show Undo',
      description: 'Show an undo toast notification.',
    },
    executionMode: 'sync',
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        message: Schema.optional(Label.annotations({ description: 'The message to display in the undo toast.' })),
      }),
      output: Schema.Void,
    },
  });
}
