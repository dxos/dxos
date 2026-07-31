//
// Copyright 2025 DXOS.org
//

import { filterMatchDoc } from '@dxos/echo-host/filter';
import {
  type GroupAggregates,
  GroupBy,
  type GroupKeyValue,
  type QueryPlan,
  filterContainsInQuery,
} from '@dxos/echo-host/query';
import {
  EncodedReference,
  type EntityPropPath,
  EntityStructure,
  type QueryAST,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { EscapedPropPath } from '@dxos/index-core';
import { EID, type EntityId, type SpaceId } from '@dxos/keys';
import { getDeep, visitValues } from '@dxos/util';

import type { ObjectCore } from '../core-db';

export type WorkingSetItem = {
  objectId: EntityId;
  spaceId: SpaceId;
  /** Automerge-backed object core. */
  core: ObjectCore;
  /** Group key, set by `AggregateStep`. Undefined without an `aggregate` clause; `{}` for one over the whole input. */
  groupKey?: GroupKeyValue;
  /** Named group aggregates, stamped by `AggregateStep`; read by a following group-level `OrderStep`. */
  aggregates?: GroupAggregates;
};

const WorkingSetItem = Object.freeze({
  isDeleted(item: WorkingSetItem): boolean {
    return item.core.isDeleted();
  },

  getProperty(item: WorkingSetItem, property: EntityPropPath): unknown {
    return getDeep(item.core.getObjectStructure().data, property);
  },

  getParentEid(item: WorkingSetItem): EID.EID | undefined {
    const raw = EntityStructure.getParent(item.core.getObjectStructure())?.['/'];
    return raw !== undefined ? EID.tryParse(raw) : undefined;
  },

  getGroupKey(item: WorkingSetItem, aggregates: readonly QueryAST.GroupAggregate[]): GroupKeyValue {
    const key: GroupKeyValue = {};
    for (const aggregate of aggregates) {
      if (aggregate.kind === 'group') {
        key[aggregate.name] = GroupBy.coerceKeyComponent(WorkingSetItem.getProperty(item, [aggregate.property]));
      }
    }
    return key;
  },
});

export type WorkingSetDataProvider = {
  spaceId: SpaceId;
  allCores(): ObjectCore[];
  getCoreById(id: EntityId, load?: boolean): ObjectCore | undefined;
  areStrongDepsSatisfied(core: ObjectCore): boolean;
};

/**
 * Executes a QueryPlan against the client-side in-memory working set.
 * No SQL index access — all selection is done by scanning loaded cores.
 * Feed-scoped reads are not served here; they go through the index-backed source.
 * Returns null when the plan requires index capabilities (TextSelector, TimestampSelector).
 */
export class WorkingSetQueryExecutor {
  constructor(private readonly _provider: WorkingSetDataProvider) {}

  /**
   * Try to execute the plan against the in-memory working set.
   * Returns null if the plan requires SQL index access.
   */
  tryExecute(plan: QueryPlan.Plan): WorkingSetItem[] | null {
    return this._execPlan(plan, []);
  }

  private _execPlan(plan: QueryPlan.Plan, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    for (const step of plan.steps) {
      const result = this._execStep(step, ws);
      if (result === null) {
        return null;
      }
      ws = result;
    }
    return ws;
  }

  private _execStep(step: QueryPlan.Step, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    switch (step._tag) {
      case 'ClearWorkingSetStep':
        return [];
      case 'SelectStep':
        return this._execSelectStep(step, ws);
      case 'FilterStep':
        return this._execFilterStep(step, ws);
      case 'FilterDeletedStep':
        return this._execFilterDeletedStep(step, ws);
      case 'TraverseStep':
        return this._execTraverseStep(step, ws);
      case 'UnionStep':
        return this._execUnionStep(step, ws);
      case 'SetDifferenceStep':
        return this._execSetDifferenceStep(step, ws);
      case 'OrderStep':
        return this._execOrderStep(step, ws);
      case 'LimitStep':
        // After an AggregateStep, limit pages over whole groups; otherwise it slices the flat stream.
        return _isGroupedWorkingSet(ws)
          ? GroupBy.takeGroups(ws, step.limit, _serializeItemGroupKey)
          : ws.slice(0, step.limit);
      case 'SkipStep':
        return _isGroupedWorkingSet(ws)
          ? GroupBy.dropGroups(ws, step.skip, _serializeItemGroupKey)
          : ws.slice(step.skip);
      case 'AggregateStep':
        return this._execAggregateStep(step, ws);
      default:
        return null;
    }
  }

  private _execAggregateStep(step: QueryPlan.AggregateStep, ws: WorkingSetItem[]): WorkingSetItem[] {
    const withKeys = ws.map((item) => ({ ...item, groupKey: WorkingSetItem.getGroupKey(item, step.aggregates) }));
    const partitioned = GroupBy.partitionByGroupKey(withKeys, (item) => GroupBy.serializeGroupKey(item.groupKey!));
    return GroupBy.withGroupAggregates(
      partitioned,
      (item) => GroupBy.serializeGroupKey(item.groupKey!),
      step.aggregates,
      (item, property) => WorkingSetItem.getProperty(item, [property]),
      (a, b, order) => this._compareByOrder(a, b, order),
    );
  }

  private _execSelectStep(step: QueryPlan.SelectStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    // TextSelector and TimestampSelector require index — bail out.
    if (step.selector._tag === 'TextSelector' || step.selector._tag === 'TimestampSelector') {
      return null;
    }

    // Check if this scope includes our space. A feed-only scope resolves to no working-set items:
    // feed reads are served by the index-backed source, not here.
    const spaceScopes = step.scope.filter((scope): scope is QueryAST.SpaceScope => scope._tag === 'space');

    const hasExplicitScopes = step.scope.length > 0;
    const scopeIncludesOurSpace =
      !hasExplicitScopes ||
      spaceScopes.some(
        // SpaceScope.spaceId is a plain string from the schema AST; SpaceId is a branded type
        // in this package. Both carry the same runtime value — the cast is the boundary.
        (scope) => scope.spaceId === undefined || (scope.spaceId as SpaceId) === this._provider.spaceId,
      );

    const newItems: WorkingSetItem[] = [...ws];

    if (scopeIncludesOurSpace) {
      switch (step.selector._tag) {
        case 'WildcardSelector':
        case 'TypeSelector': {
          // Enumerate all loaded cores; FilterStep enforces any type predicate.
          const cores = this._provider.allCores().filter((core) => this._provider.areStrongDepsSatisfied(core));
          newItems.push(...cores.map((core) => this._coreToItem(core)));
          break;
        }
        case 'IdSelector': {
          for (const id of step.selector.objectIds) {
            const core = this._provider.getCoreById(id, true);
            if (core && this._provider.areStrongDepsSatisfied(core)) {
              newItems.push(this._coreToItem(core));
            }
          }
          break;
        }
      }
    }

    // Deduplicate by objectId.
    const seen = new Set<EntityId>();
    const deduped = newItems.filter((item) => {
      if (seen.has(item.objectId)) {
        return false;
      }
      seen.add(item.objectId);
      return true;
    });

    return step.limit !== undefined ? deduped.slice(0, step.limit) : deduped;
  }

  private _execFilterStep(step: QueryPlan.FilterStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    // child-of filter requires transitive parent traversal against in-memory objects.
    if (step.filter.type === 'child-of') {
      return this._execChildOfFilterStep(step.filter, ws);
    }

    // Timestamp filter requires index — bail.
    if (_filterContainsTimestamp(step.filter)) {
      return null;
    }

    // A nested in-query (subquery-membership) predicate cannot be resolved correctly against
    // this in-memory working set: the subquery may target a feed or another space, and
    // `_execSelectStep` returns an *empty* (not null) result for scopes outside this space — so
    // resolving locally would silently compute an empty membership set instead of the real one.
    // Bail so the whole branch defers to the index-backed source, which can resolve the subquery
    // across every scope.
    if (filterContainsInQuery(step.filter)) {
      return null;
    }

    return ws.filter((item) =>
      filterMatchDoc(step.filter, {
        id: item.objectId,
        doc: item.core.getObjectStructure(),
        spaceId: item.spaceId,
      }),
    );
  }

  private _execChildOfFilterStep(filter: QueryAST.FilterChildOf, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    const parentObjectIds = new Set<EntityId>();
    for (const parentDxnStr of filter.parents) {
      const echoUri = EID.tryParse(parentDxnStr);
      if (echoUri) {
        const objectId = EID.getEntityId(echoUri);
        if (objectId) {
          parentObjectIds.add(objectId);
        }
      }
    }

    const maxDepth = filter.transitive ? MAX_DEPTH_FOR_CHILD_OF_TRACING : 1;

    return ws.filter((item) => this._isChildOfAny(item, parentObjectIds, maxDepth));
  }

  private _isChildOfAny(item: WorkingSetItem, parentObjectIds: Set<EntityId>, remainingDepth: number): boolean {
    if (remainingDepth <= 0) {
      return false;
    }

    const parentEid = WorkingSetItem.getParentEid(item);
    if (!parentEid) {
      return false;
    }

    const parentId = EID.getEntityId(parentEid);
    if (!parentId) {
      return false;
    }

    if (parentObjectIds.has(parentId)) {
      return true;
    }

    // Recurse up the parent chain.
    const parentCore = this._provider.getCoreById(parentId);
    if (!parentCore) {
      return false;
    }
    return this._isChildOfAny(this._coreToItem(parentCore), parentObjectIds, remainingDepth - 1);
  }

  private _execFilterDeletedStep(step: QueryPlan.FilterDeletedStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    const expected = step.mode === 'only-deleted';
    return ws.filter((item) => WorkingSetItem.isDeleted(item) === expected);
  }

  private _execTraverseStep(step: QueryPlan.TraverseStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    switch (step.traversal._tag) {
      case 'ReferenceTraversal':
        return this._execReferenceTraversal(step.traversal, ws);
      case 'RelationTraversal':
        return this._execRelationTraversal(step.traversal, ws);
      case 'HierarchyTraversal':
        return this._execHierarchyTraversal(step.traversal, ws);
      default:
        return null;
    }
  }

  private _execReferenceTraversal(traversal: QueryPlan.ReferenceTraversal, ws: WorkingSetItem[]): WorkingSetItem[] {
    if (traversal.direction === 'outgoing') {
      const result: WorkingSetItem[] = [];
      for (const item of ws) {
        const refs = this._collectOutgoingRefs(item, traversal.property);
        for (const ref of refs) {
          const eid = EID.tryParse(EncodedReference.toURI(ref));
          if (!eid) {
            continue;
          }
          const id = EID.getEntityId(eid);
          if (!id) {
            continue;
          }
          const core = this._provider.getCoreById(id);
          if (core) {
            result.push(this._coreToItem(core));
          }
        }
      }
      return result;
    } else {
      // Incoming references: scan all loaded cores for those referencing any ws item.
      const wsIds = new Set(ws.map((item) => item.objectId));
      const result: WorkingSetItem[] = [];
      for (const core of this._provider.allCores()) {
        const structure = core.getObjectStructure();
        if (_structureReferencesAny(structure, wsIds, traversal.property)) {
          result.push(this._coreToItem(core));
        }
      }
      return result;
    }
  }

  private _collectOutgoingRefs(item: WorkingSetItem, property: EscapedPropPath | null): EncodedReference[] {
    const structure = item.core.getObjectStructure();
    if (property !== null) {
      // Collect refs at specified property path only.
      const path = EscapedPropPath.unescape(property);
      const value = getDeep(structure.data, path);
      const refs: EncodedReference[] = [];
      if (isEncodedReference(value)) {
        refs.push(value);
      } else if (Array.isArray(value)) {
        for (const element of value) {
          if (isEncodedReference(element)) {
            refs.push(element);
          }
        }
      }
      return refs;
    } else {
      // Collect all outgoing refs.
      return EntityStructure.getAllOutgoingReferences(structure).map((refEntry) => refEntry.reference);
    }
  }

  private _execRelationTraversal(traversal: QueryPlan.RelationTraversal, ws: WorkingSetItem[]): WorkingSetItem[] {
    const all = this._provider.allCores();

    switch (traversal.direction) {
      case 'relation-to-source':
      case 'relation-to-target': {
        const result: WorkingSetItem[] = [];
        for (const item of ws) {
          const ref =
            traversal.direction === 'relation-to-source'
              ? EntityStructure.getRelationSource(item.core.getObjectStructure())
              : EntityStructure.getRelationTarget(item.core.getObjectStructure());
          const raw = ref?.['/'];
          if (!raw) {
            continue;
          }
          const eid = EID.tryParse(raw);
          if (!eid) {
            continue;
          }
          const id = EID.getEntityId(eid);
          if (!id) {
            continue;
          }
          const core = this._provider.getCoreById(id);
          if (core) {
            result.push(this._coreToItem(core));
          }
        }
        return result;
      }

      case 'source-to-relation':
      case 'target-to-relation': {
        const wsIds = new Set(ws.map((item) => item.objectId));
        const result: WorkingSetItem[] = [];
        for (const core of all) {
          if (EntityStructure.getEntityKind(core.getObjectStructure()) !== 'relation') {
            continue;
          }
          const ref =
            traversal.direction === 'source-to-relation'
              ? EntityStructure.getRelationSource(core.getObjectStructure())
              : EntityStructure.getRelationTarget(core.getObjectStructure());
          const raw = ref?.['/'];
          if (!raw) {
            continue;
          }
          const eid = EID.tryParse(raw);
          if (!eid) {
            continue;
          }
          const id = EID.getEntityId(eid);
          if (id && wsIds.has(id)) {
            result.push(this._coreToItem(core));
          }
        }
        return result;
      }
    }
  }

  private _execHierarchyTraversal(traversal: QueryPlan.HierarchyTraversal, ws: WorkingSetItem[]): WorkingSetItem[] {
    if (traversal.direction === 'to-parent') {
      const result: WorkingSetItem[] = [];
      for (const item of ws) {
        const ref = EntityStructure.getParent(item.core.getObjectStructure());
        if (!ref || !EncodedReference.isEncodedReference(ref)) {
          continue;
        }
        const eid = EID.tryParse(EncodedReference.toURI(ref));
        if (!eid) {
          continue;
        }
        const id = EID.getEntityId(eid);
        if (!id) {
          continue;
        }
        const core = this._provider.getCoreById(id);
        if (core) {
          result.push(this._coreToItem(core));
        }
      }
      return result;
    } else {
      // to-children: scan all cores for those whose parent is in the working set.
      const wsIds = new Set(ws.map((item) => item.objectId));
      const result: WorkingSetItem[] = [];
      for (const core of this._provider.allCores()) {
        const ref = EntityStructure.getParent(core.getObjectStructure());
        if (!ref || !EncodedReference.isEncodedReference(ref)) {
          continue;
        }
        const eid = EID.tryParse(EncodedReference.toURI(ref));
        if (!eid) {
          continue;
        }
        const id = EID.getEntityId(eid);
        if (id && wsIds.has(id)) {
          result.push(this._coreToItem(core));
        }
      }
      return result;
    }
  }

  private _execUnionStep(step: QueryPlan.UnionStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    const results = new Map<EntityId, WorkingSetItem>();
    for (const plan of step.plans) {
      const subResult = this._execPlan(plan, [...ws]);
      if (subResult === null) {
        return null;
      }
      for (const item of subResult) {
        results.set(item.objectId, item);
      }
    }
    return [...results.values()];
  }

  private _execSetDifferenceStep(step: QueryPlan.SetDifferenceStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    const sourceResult = this._execPlan(step.source, [...ws]);
    const excludeResult = this._execPlan(step.exclude, [...ws]);
    if (sourceResult === null || excludeResult === null) {
      return null;
    }
    const excludeIds = new Set(excludeResult.map((item) => item.objectId));
    return sourceResult.filter((item) => !excludeIds.has(item.objectId));
  }

  private _execOrderStep(step: QueryPlan.OrderStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    const compare = (itemA: WorkingSetItem, itemB: WorkingSetItem): number => {
      for (const order of step.order) {
        const cmp = this._compareByOrder(itemA, itemB, order);
        if (cmp !== 0) {
          return cmp;
        }
      }
      return 0;
    };

    // After an AggregateStep the working set is partitioned into contiguous groups; a post-group order
    // reorders whole groups (by their aggregates), and a pushed-down limit pages over whole groups.
    if (_isGroupedWorkingSet(ws)) {
      const sorted = GroupBy.orderGroups(ws, _serializeItemGroupKey, compare);
      return step.limit !== undefined ? GroupBy.takeGroups(sorted, step.limit, _serializeItemGroupKey) : sorted;
    }

    const sorted = [...ws].sort(compare);
    return step.limit !== undefined ? sorted.slice(0, step.limit) : sorted;
  }

  private _compareByOrder(itemA: WorkingSetItem, itemB: WorkingSetItem, order: QueryAST.Order): number {
    switch (order.kind) {
      case 'natural': {
        // The working set has no queue/insertion order (that lives in the feed index); fall back
        // to a stable id ordering so results are deterministic.
        const comparison = itemA.objectId.localeCompare(itemB.objectId);
        return order.direction === 'desc' ? -comparison : comparison;
      }
      case 'rank':
        // No rank info available in working set; treat as equal.
        return 0;
      case 'timestamp':
        // No timestamp index on client; treat as equal.
        return 0;
      case 'property': {
        // On a grouped working set, a property order names a group field: prefer a stamped scalar
        // aggregate (max/min/count) when present, else the member/row property (which also covers a
        // group-key component, shared by every member).
        const aVal =
          itemA.aggregates && order.property in itemA.aggregates
            ? itemA.aggregates[order.property]
            : WorkingSetItem.getProperty(itemA, [order.property]);
        const bVal =
          itemB.aggregates && order.property in itemB.aggregates
            ? itemB.aggregates[order.property]
            : WorkingSetItem.getProperty(itemB, [order.property]);
        const cmp = _compareValues(aVal, bVal);
        return order.direction === 'desc' ? -cmp : cmp;
      }
      default:
        return 0;
    }
  }

  private _coreToItem(core: ObjectCore): WorkingSetItem {
    return {
      // ObjectCore.id is typed as string; this cast is a type-system boundary —
      // entity ids are structurally EntityId strings but the core uses a plain string type.
      objectId: core.id as EntityId,
      spaceId: this._provider.spaceId,
      core,
    };
  }
}

const MAX_DEPTH_FOR_CHILD_OF_TRACING = 16;

/** True once the working set has been partitioned by an AggregateStep (every item carries a group key). */
const _isGroupedWorkingSet = (ws: WorkingSetItem[]): boolean => ws.length > 0 && ws[0].groupKey !== undefined;

// Non-null assertion is sound: only called from group-aware limit/skip, which run exclusively on a
// working set already partitioned by AggregateStep (guarded by `_isGroupedWorkingSet`).
const _serializeItemGroupKey = (item: WorkingSetItem): string => GroupBy.serializeGroupKey(item.groupKey!);

const _compareValues = (valueA: unknown, valueB: unknown): number => {
  if (valueA == null && valueB == null) {
    return 0;
  }
  if (valueA == null) {
    return 1;
  }
  if (valueB == null) {
    return -1;
  }
  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return valueA.localeCompare(valueB);
  }
  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }
  return String(valueA).localeCompare(String(valueB));
};

const _filterContainsTimestamp = (filter: QueryAST.Filter): boolean => {
  if (filter.type === 'timestamp') {
    return true;
  }
  if (filter.type === 'and' || filter.type === 'or') {
    return filter.filters.some(_filterContainsTimestamp);
  }
  if (filter.type === 'not') {
    return _filterContainsTimestamp(filter.filter);
  }
  return false;
};

/**
 * Returns true if the given EntityStructure contains a reference to any object
 * in targetIds, optionally restricted to the specified property path.
 */
const _structureReferencesAny = (
  structure: EntityStructure,
  targetIds: Set<EntityId>,
  property: EscapedPropPath | null,
): boolean => {
  const data = structure.data;
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (property !== null) {
    // Check only the specified property path.
    const path = EscapedPropPath.unescape(property);
    const value = getDeep(data, path);
    return _valueReferencesAny(value, targetIds);
  }

  // Check all data fields.
  let found = false;
  visitValues(data, (value) => {
    if (found) {
      return;
    }
    if (isEncodedReference(value)) {
      const eid = EID.tryParse(EncodedReference.toURI(value));
      if (eid) {
        const id = EID.getEntityId(eid);
        if (id && targetIds.has(id)) {
          found = true;
        }
      }
    }
  });
  return found;
};

const _valueReferencesAny = (value: unknown, targetIds: Set<EntityId>): boolean => {
  if (isEncodedReference(value)) {
    try {
      const eid = EID.tryParse(EncodedReference.toURI(value));
      if (!eid) {
        return false;
      }
      const id = EID.getEntityId(eid);
      return id != null && targetIds.has(id);
    } catch {
      return false;
    }
  }
  if (Array.isArray(value)) {
    return value.some((element) => _valueReferencesAny(element, targetIds));
  }
  return false;
};
