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
import { EID, type SpaceId } from '@dxos/keys';
import { type QueryService } from '@dxos/protocols/rpc';

import type { AutomergeHost } from '../automerge/index.ts';
import type { SpaceStateManager } from '../db-host/index.ts';
import { type GroupAggregates, GroupBy, type GroupKeyValue } from './group-by.ts';
import { type QueryPlan } from './plan.ts';

/**
 * One row of a `Filter.changes` working set: a replayed change, or an activity index bucket standing
 * for `weight` changes.
 */
export type ChangeItem = {
  spaceId: SpaceId;
  /**
   * The `Change.Change` fields of a replayed change; only `source`, `time` (the hour's start) and `ops`
   * (the bucket's total) for a bucket, which the planner routes only to aggregates reading nothing else.
   */
  record: Readonly<Record<string, string | number>>;
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

/**
 * Runs a plan starting with a `ChangesSelector` select. The planner (`_routeChanges`) guarantees
 * only ordering, paging and aggregation follow it.
 */
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

/** Results shipped for a `Filter.changes` query: plain records, or collapsed groups. */
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
    return { id: String(item.record.key), spaceId: item.spaceId, rank: 1, recordJson: JSON.stringify(item.record) };
  });

/** Serialized form of a result set, compared across runs to detect a change. */
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
      for (const row of rows) {
        items.push({ spaceId, record: { source: 'document', time: row.hour, ops: row.ops }, weight: row.changes });
      }
    }
    return items;
  }

  for (const { spaceId, documentId } of documents ?? []) {
    // Merged branch changes reappear in the main document under the same hashes.
    if (deps.spaceStateManager.isBranchDocument(documentId)) {
      continue;
    }
    // Local storage only, as the object executor loads: a collected document must not wait on the network.
    using lease = await deps.automergeHost.loadDoc<Record<string, unknown>>(ctx, documentId, {
      fetchFromNetwork: false,
    });
    if (!lease) {
      continue;
    }
    for (const meta of A.getChangesMetaSince(lease.doc(), [])) {
      // A change with no clock has no time to report; the activity index skips it too.
      if (meta.time > 0) {
        items.push({
          spaceId,
          record: {
            key: meta.hash,
            source: 'document',
            time: meta.time * 1000,
            actor: meta.actor,
            seq: meta.seq,
            ops: meta.maxOp - meta.startOp + 1,
          },
          weight: 1,
        });
      }
    }
  }
  return items.sort(compareNatural);
};

/**
 * The documents holding `targets` within the scoped spaces; a target the index does not know (never
 * synced, collected, or in another space) has none.
 */
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
      const stamped = GroupBy.withGroupAggregates(
        partitioned,
        getGroupKey,
        step.aggregates,
        (item, property) => item.record[property],
      );
      return GroupBy.collapseGroups(stamped, getGroupKey);
    }
    default:
      throw new Error(`Unexpected step after a changes select: ${step._tag}`);
  }
};

// Only called on a grouped working set, where every item has a key.
const getGroupKey = (item: ChangeItem): string => GroupBy.serializeGroupKey(item.groupKey!);

const groupKeyOf = (item: ChangeItem, aggregates: readonly QueryAST.GroupAggregate[]): GroupKeyValue => {
  const key: GroupKeyValue = {};
  for (const aggregate of aggregates) {
    if (aggregate.kind === 'group') {
      key[aggregate.name] = GroupBy.resolveKeyComponent(aggregate.properties, (property) => item.record[property]);
    } else if (aggregate.kind === 'time') {
      key[aggregate.name] = GroupBy.truncateTime(item.record[aggregate.property], aggregate.unit);
    }
  }
  return key;
};

/** Chronological, with the key breaking ties so the order is stable across runs. */
const compareNatural = (a: ChangeItem, b: ChangeItem): number =>
  Number(a.record.time) - Number(b.record.time) || String(a.record.key ?? '').localeCompare(String(b.record.key ?? ''));

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

/** After aggregation a property order names a group field (a key or an aggregate); before, a change field. */
const propertyOf = (item: ChangeItem, property: string) =>
  item.aggregates && property in item.aggregates ? item.aggregates[property] : (item.record[property] ?? null);
