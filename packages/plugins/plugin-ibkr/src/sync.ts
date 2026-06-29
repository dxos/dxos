//
// Copyright 2026 DXOS.org
//

import { Operation, Trigger } from '@dxos/compute';
import { EID, type Database, Ref } from '@dxos/echo';

import { IBKR_SYNC_CRON } from './constants';
import { IbkrOperation } from './types';

/** Stable string form of the sync operation's key, used to recognize its serialized record. */
export const SYNC_OPERATION_KEY = String(IbkrOperation.SyncPortfolioReport.meta.key);

/** Entity id of a trigger's referenced runnable, or undefined if it has none. */
const triggerFunctionId = (trigger: Trigger.Trigger): string | undefined => {
  const uri = trigger.runnable?.uri;
  const eid = uri !== undefined ? EID.tryParse(uri) : undefined;
  return eid !== undefined ? EID.getEntityId(eid) : undefined;
};

/** The serialized {@link IbkrOperation.SyncPortfolioReport} operation among persisted operations, if present. */
export const findSyncOperation = (
  operations: readonly Operation.PersistentOperation[],
): Operation.PersistentOperation | undefined =>
  operations.find((operation) => String(Operation.getKey(operation)) === SYNC_OPERATION_KEY);

/**
 * The space's daily-sync timer trigger: the timer trigger whose function is the serialized sync
 * operation. The sync operation is space-scoped (it finds the feed by kind), so there is at most one.
 */
export const findSyncTrigger = (
  triggers: readonly Trigger.Trigger[],
  operations: readonly Operation.PersistentOperation[],
): Trigger.Trigger | undefined => {
  const operation = findSyncOperation(operations);
  if (!operation) {
    return undefined;
  }
  // The ref's URI form varies (relative vs. fully-qualified) by persistence state; compare the
  // invariant entity id instead.
  return triggers.find((trigger) => trigger.spec?.kind === 'timer' && triggerFunctionId(trigger) === operation.id);
};

/**
 * Creates the daily IBKR portfolio-sync trigger for a space: a timer trigger on {@link IBKR_SYNC_CRON}
 * that runs the {@link IbkrOperation.SyncPortfolioReport} operation. Reuses the passed serialized operation when
 * given, otherwise serializes a fresh one. The trigger is created enabled and is then toggled on/off
 * from the portfolio properties panel.
 */
export const createDailySyncTrigger = (
  db: Database.Database,
  operation?: Operation.PersistentOperation,
): Trigger.Trigger => {
  const op = operation ?? db.add(Operation.serialize(IbkrOperation.SyncPortfolioReport));
  return db.add(Trigger.make({ enabled: true, spec: Trigger.specTimer(IBKR_SYNC_CRON), runnable: Ref.make(op) }));
};
