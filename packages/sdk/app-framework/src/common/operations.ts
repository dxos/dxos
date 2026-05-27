//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { Capability } from '../core';
import { Label } from './translations';

const UNDO_NAMESPACE = 'org.dxos.app-framework.undo';

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
      key: DXN.make(`${UNDO_NAMESPACE}.operation.showUndo`),
      name: 'Show Undo',
      description: 'Show an undo toast notification.',
      icon: 'ph--arrow-counter-clockwise--regular',
    },
    executionMode: 'sync',
    services: [Capability.Service],
    input: Schema.Struct({
      message: Schema.optional(Label.annotations({ description: 'The message to display in the undo toast.' })),
    }),
    output: Schema.Void,
  });
}
