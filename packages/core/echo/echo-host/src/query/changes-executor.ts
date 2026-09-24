//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import type * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type Context } from '@dxos/context';
import { type QueryAST } from '@dxos/echo-protocol';
import { type IndexEngine } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { EID, type SpaceId } from '@dxos/keys';
import { type QueryService } from '@dxos/protocols/rpc';

import type { AutomergeHost } from '../automerge/index.ts';
import { type ChangeRecord, toChangeRecord } from '../db-host/change-record.ts';
import type { SpaceStateManager } from '../db-host/index.ts';
import { type GroupAggregates, GroupBy, type GroupKeyValue } from './group-by.ts';
import { type QueryPlan } from './plan.ts';

/** A replayed change, or an hourly activity bucket standing for its `changes`. */
type ChangeRow =
  | { kind: 'change'; change: ChangeRecord }
  | { kind: 'bucket'; hour: number; changes: number; ops: number };

export type ChangeItem = {
  spaceId: SpaceId;
  row: ChangeRow;
  weight: number;
  groupKey?: GroupKeyValue;
  aggregates?: GroupAggregates;
  collapsed?: { size: number };
};

export type ChangesExecutorDeps = {
  indexEngine: IndexEngine;
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
  runInRuntime: <T>(effect: Effect.Effect<T, unknown, SqlClient.SqlClient>) => Promise<T>;
};

export const executeChangesPlan = async (
  ctx: Context,
  plan: QueryPlan.Plan,
  deps: ChangesExecutorDeps,
): Promise<ChangeItem[]> => {
  const [select, ...rest] = plan.steps;
  if (select._tag !== 'SelectStep' || select.selector._tag !== 'ChangesSelector') {
    throw new Error('Expected a changes select step.');
  }
  const spaceIds = select.scope.flatMap((scope) => (scope._tag === 'space' ? [scope.spaceId as SpaceId] : []));
  let workingSet = await selectChanges(ctx, select.selector, spaceIds, deps);
  for (const step of rest) {
    workingSet = execStep(step, workingSet);
  }
  return workingSet;
};

export const changeResults = (items: readonly ChangeItem[]): QueryService.QueryResult[] =>
  items.map((item): QueryService.QueryResult => {
    if (item.collapsed !== undefined && item.groupKey !== undefined) {
      const groupKey = GroupBy.serializeGroupKey(item.groupKey);
      return {
        id: groupKey,
        spaceId: item.spaceId,
        rank: 1,
        groupKey,
        groupCount: item.collapsed.size,
        aggregates: JSON.stringify(item.aggregates ?? {}),
      };
    }
    invariant(item.row.kind === 'change', 'Only a replayed change ships as a record.');
    const { change } = item.row;
    return { id: change.key, spaceId: item.spaceId, rank: 1, recordJson: JSON.stringify(change) };
  });

export const serializeChangeResults = (items: readonly ChangeItem[]): string =>
  JSON.stringify(changeResults(items).map(({ id, groupCount, aggregates }) => [id, groupCount, aggregates]));

const selectChanges = async (
  ctx: Context,
  selector: QueryPlan.ChangesSelector,
  spaceIds: readonly SpaceId[],
  deps: ChangesExecutorDeps,
): Promise<ChangeItem[]> => {
  const documents = selector.targets && (await resolveDocuments(selector.targets, spaceIds, deps));
  const items: ChangeItem[] = [];

  if (selector.source === 'index') {
    for (const spaceId of spaceIds) {
      const documentIds = documents?.filter((document) => document.spaceId === spaceId).map((doc) => doc.documentId);
      const rows = await deps.runInRuntime(deps.indexEngine.queryActivity({ spaceId, documentIds }));
      for (const { hour, changes, ops } of rows) {
        items.push({ spaceId, row: { kind: 'bucket', hour, changes, ops }, weight: changes });
      }
    }
    return items;
  }

  for (const { spaceId, documentId } of documents ?? []) {
    if (deps.spaceStateManager.isBranchDocument(documentId)) {
      continue;
    }
    using lease = await deps.automergeHost.loadDoc<Record<string, unknown>>(ctx, documentId, {
      fetchFromNetwork: false,
    });
    if (!lease) {
      continue;
    }
    for (const meta of A.getChangesMetaSince(lease.doc(), [])) {
      const change = toChangeRecord(meta);
      if (change) {
        items.push({ spaceId, row: { kind: 'change', change }, weight: 1 });
      }
    }
  }
  return items.sort(compareNatural);
};

const resolveDocuments = async (
  targets: readonly EID.EID[],
  spaceIds: readonly SpaceId[],
  deps: ChangesExecutorDeps,
): Promise<{ spaceId: SpaceId; documentId: DocumentId }[]> => {
  const objectIds = targets.flatMap((target) => {
    const entityId = EID.getEntityId(target);
    return entityId ? [entityId] : [];
  });
  if (objectIds.length === 0 || spaceIds.length === 0) {
    return [];
  }
  const metas = await deps.runInRuntime(deps.indexEngine.queryObjectIds({ spaceIds, objectIds }));
  const documents = new Map<string, { spaceId: SpaceId; documentId: DocumentId }>();
  for (const meta of metas) {
    if (meta.documentId) {
      documents.set(`${meta.spaceId}/${meta.documentId}`, {
        spaceId: meta.spaceId as SpaceId,
        documentId: meta.documentId as DocumentId,
      });
    }
  }
  return [...documents.values()];
};

const execStep = (step: QueryPlan.Step, workingSet: ChangeItem[]): ChangeItem[] => {
  const grouped = workingSet.length > 0 && workingSet[0].groupKey !== undefined;
  switch (step._tag) {
    case 'OrderStep': {
      const compare = (a: ChangeItem, b: ChangeItem) => compareMultiOrder(a, b, step.order);
      const sorted = grouped ? GroupBy.orderGroups(workingSet, getGroupKey, compare) : [...workingSet].sort(compare);
      if (step.limit === undefined) {
        return sorted;
      }
      return grouped ? GroupBy.takeGroups(sorted, step.limit, getGroupKey) : sorted.slice(0, step.limit);
    }
    case 'LimitStep':
      return grouped ? GroupBy.takeGroups(workingSet, step.limit, getGroupKey) : workingSet.slice(0, step.limit);
    case 'SkipStep':
      return grouped ? GroupBy.dropGroups(workingSet, step.skip, getGroupKey) : workingSet.slice(step.skip);
    case 'AggregateStep': {
      const withKeys = workingSet.map((item) => ({ ...item, groupKey: groupKeyOf(item, step.aggregates) }));
      const partitioned = GroupBy.partitionByGroupKey(withKeys, getGroupKey);
      const stamped = GroupBy.withGroupAggregates(partitioned, getGroupKey, step.aggregates, (item, property) =>
        fieldOf(item.row, property),
      );
      return GroupBy.collapseGroups(stamped, getGroupKey);
    }
    default:
      throw new Error(`Unexpected step after a changes select: ${step._tag}`);
  }
};

const getGroupKey = (item: ChangeItem): string => {
  invariant(item.groupKey, 'Grouped steps run only after an aggregate keyed every item.');
  return GroupBy.serializeGroupKey(item.groupKey);
};

/** The row's `Change.Change` fields; a bucket has only `source`, `time` and `ops`, all the planner lets it read. */
const fieldsOf = (row: ChangeRow): Readonly<Record<string, unknown>> =>
  row.kind === 'change' ? row.change : { source: 'document', time: row.hour, ops: row.ops };

const fieldOf = (row: ChangeRow, property: string): unknown => fieldsOf(row)[property];

const groupKeyOf = (item: ChangeItem, aggregates: readonly QueryAST.GroupAggregate[]): GroupKeyValue => {
  const key: GroupKeyValue = {};
  for (const aggregate of aggregates) {
    if (aggregate.kind === 'group') {
      key[aggregate.name] = GroupBy.resolveKeyComponent(aggregate.properties, (property) =>
        fieldOf(item.row, property),
      );
    } else if (aggregate.kind === 'time') {
      key[aggregate.name] = GroupBy.truncateTime(fieldOf(item.row, aggregate.property), aggregate.unit);
    }
  }
  return key;
};

const compareNatural = (a: ChangeItem, b: ChangeItem): number =>
  Number(fieldOf(a.row, 'time')) - Number(fieldOf(b.row, 'time')) ||
  String(fieldOf(a.row, 'key') ?? '').localeCompare(String(fieldOf(b.row, 'key') ?? ''));

const compareMultiOrder = (a: ChangeItem, b: ChangeItem, orders: readonly QueryAST.Order[]): number => {
  for (const order of orders) {
    const comparison =
      order.kind === 'natural'
        ? compareNatural(a, b)
        : order.kind === 'property'
          ? GroupBy.compareScalar(propertyOf(a, order.property), propertyOf(b, order.property))
          : 0;
    if (comparison !== 0) {
      return order.direction === 'desc' ? -comparison : comparison;
    }
  }
  return 0;
};

const propertyOf = (item: ChangeItem, property: string) =>
  item.aggregates && property in item.aggregates
    ? item.aggregates[property]
    : GroupBy.coerceKeyComponent(fieldOf(item.row, property));
