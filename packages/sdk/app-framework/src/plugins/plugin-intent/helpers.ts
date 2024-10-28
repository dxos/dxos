//
// Copyright 2024 DXOS.org
//

import { type IntentExecution } from './IntentContext';

/**
 * Check if the chain of intents is undoable.
 */
export const isUndoable = (chain: IntentExecution[]): boolean =>
  chain.length > 0 && chain.every(({ result }) => result.undoable);
