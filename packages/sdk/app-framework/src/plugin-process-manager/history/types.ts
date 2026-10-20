//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

import { type Label } from '../../common/translations.ts';

/**
 * One forward invocation and the inverse that reverses it.
 */
export type HistoryStep = {
  operation: Operation.Definition<any, any>;
  input: any;
  output: any;
  inverse: Operation.Definition<any, any>;
  inverseInput: any;
};

/**
 * History entry stored by HistoryTracker: a single invocation, a merged run of invocations, or a transaction.
 */
export type HistoryEntry = {
  /** Steps in forward order; undo runs their inverses in reverse order. */
  steps: HistoryStep[];
  /** Document or subject the entry belongs to; undefined entries are reachable only by unscoped undo/redo. */
  scope?: string;
  /** Entries with equal scope and merge key recorded within the merge window fold together. */
  mergeKey?: string;
  /** Opaque caller state (e.g. view path and selection) handed back on undo and redo. */
  context?: unknown;
  /** Message describing the entry (toast label). */
  message?: Label;
  /** Time the entry was first recorded. */
  timestamp: number;
  /** Time the entry last absorbed an invocation; the merge window slides from here. */
  updated: number;
};
