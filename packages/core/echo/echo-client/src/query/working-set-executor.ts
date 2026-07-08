//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { filterMatchDoc, filterMatchObjectJSON } from '@dxos/echo-host/filter';
import { QueryPlan } from '@dxos/echo-host/query';
import {
  EncodedReference,
  type EntityPropPath,
  EntityStructure,
  type ForeignKey,
  type QueryAST,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { ATTR_PARENT, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET } from '@dxos/echo/internal';
import { EscapedPropPath } from '@dxos/index-core';
import { EID, type EntityId, type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { getDeep, isNonNullable, visitValues } from '@dxos/util';

import type { ObjectCore } from '../core-db';

export type WorkingSetItem = {
  objectId: EntityId;
  spaceId: SpaceId;
  queueId: EntityId | null;
  queueNamespace: string | null;
  /** Automerge-backed object core. */
  core: ObjectCore | null;
  /** Feed/queue JSON payload. */
  data: Obj.JSON | null;
  /** Group-by key, set by `GroupByStep`. Undefined for queries without a `groupBy` clause. */
  groupKey?: QueryPlan.GroupKeyValue;
};

const WorkingSetItem = Object.freeze({
  isDeleted(item: WorkingSetItem): boolean {
    if (item.core) {
      return item.core.isDeleted();
    }
    if (item.data) {
      return item.data['@deleted'] === true;
    }
    return false;
  },

  getProperty(item: WorkingSetItem, property: EntityPropPath): unknown {
    if (item.core) {
      return getDeep(item.core.getObjectStructure().data, property);
    }
    if (item.data) {
      return getDeep(item.data, property);
    }
    return undefined;
  },

  getParentEid(item: WorkingSetItem): EID.EID | undefined {
    let raw: string | undefined;
    if (item.core) {
      raw = EntityStructure.getParent(item.core.getObjectStructure())?.['/'];
    } else if (item.data) {
      raw = item.data[ATTR_PARENT];
    }
    return raw !== undefined ? EID.tryParse(raw) : undefined;
  },

  getGroupKey(item: WorkingSetItem, keys: readonly QueryAST.GroupByKey[]): QueryPlan.GroupKeyValue {
    const key: QueryPlan.GroupKeyValue = {};
    for (const groupByKey of keys) {
      switch (groupByKey.kind) {
        case 'property':
          key[groupByKey.property] = QueryPlan.GroupByStep.coerceKeyComponent(
            WorkingSetItem.getProperty(item, [groupByKey.property]),
          );
          break;
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
  /** Optional: enumerate locally-cached feed items for the given queue IDs. */
  getFeedItems?: (queueIds: EntityId[]) => WorkingSetFeedItem[];
};

export type WorkingSetFeedItem = {
  objectId: EntityId;
  spaceId: SpaceId;
  queueId: EntityId;
  queueNamespace: string | null;
  data: Obj.JSON;
};

/**
 * Executes a QueryPlan against the client-side in-memory working set.
 * No SQL index access — all selection is done by scanning loaded cores.
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
        return ws.slice(0, step.limit);
      case 'SkipStep':
        return ws.slice(step.skip);
      case 'GroupByStep':
        return this._execGroupByStep(step, ws);
      default:
        return null;
    }
  }

  private _execGroupByStep(step: QueryPlan.GroupByStep, ws: WorkingSetItem[]): WorkingSetItem[] {
    const withKeys = ws.map((item) => ({ ...item, groupKey: WorkingSetItem.getGroupKey(item, step.keys) }));
    return QueryPlan.GroupByStep.partitionByGroupKey(withKeys, (item) =>
      QueryPlan.GroupByStep.serializeGroupKey(item.groupKey!),
    );
  }

  private _execSelectStep(step: QueryPlan.SelectStep, ws: WorkingSetItem[]): WorkingSetItem[] | null {
    // TextSelector and TimestampSelector require index — bail out.
    if (step.selector._tag === 'TextSelector' || step.selector._tag === 'TimestampSelector') {
      return null;
    }

    // Check if this scope includes our space.
    const spaceScopes = step.scope.filter((scope): scope is QueryAST.SpaceScope => scope._tag === 'space');
    const feedScopes = step.scope.filter((scope): scope is QueryAST.FeedScope => scope._tag === 'feed');

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

    // Feed items for explicit feed scopes.
    if (feedScopes.length > 0 && this._provider.getFeedItems) {
      const queueIds = feedScopes
        .map((scope) => {
          const eid = EID.tryParse(String(scope.feedUri));
          return eid ? EID.getEntityId(eid) : null;
        })
        .filter(isNonNullable);
      // An IdSelector narrows the query to specific ids; the following FilterStep no longer
      // carries the id predicate (the planner moves it into the selector), so feed items must be
      // narrowed here or every feed item would leak through.
      const idSelector = step.selector._tag === 'IdSelector' ? new Set<string>(step.selector.objectIds) : null;
      const feedItems = this._provider
        .getFeedItems(queueIds)
        .filter((feedItem) => idSelector === null || idSelector.has(feedItem.objectId));
      newItems.push(
        ...feedItems.map(
          (feedItem): WorkingSetItem => ({
            objectId: feedItem.objectId,
            spaceId: feedItem.spaceId,
            queueId: feedItem.queueId,
            queueNamespace: feedItem.queueNamespace,
            core: null,
            data: feedItem.data,
          }),
        ),
      );
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

    return ws.filter((item) => {
      if (item.core) {
        return filterMatchDoc(step.filter, {
          id: item.objectId,
          doc: item.core.getObjectStructure(),
          spaceId: item.spaceId,
        });
      }
      if (item.data) {
        return filterMatchObjectJSON(step.filter, item.data);
      }
      return false;
    });
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
    if (item.core) {
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
    return [];
  }

  private _execRelationTraversal(traversal: QueryPlan.RelationTraversal, ws: WorkingSetItem[]): WorkingSetItem[] {
    const all = this._provider.allCores();

    switch (traversal.direction) {
      case 'relation-to-source':
      case 'relation-to-target': {
        const result: WorkingSetItem[] = [];
        for (const item of ws) {
          let raw: string | undefined;
          if (item.core) {
            const ref =
              traversal.direction === 'relation-to-source'
                ? EntityStructure.getRelationSource(item.core.getObjectStructure())
                : EntityStructure.getRelationTarget(item.core.getObjectStructure());
            raw = ref?.['/'];
          } else if (item.data) {
            raw =
              traversal.direction === 'relation-to-source'
                ? (item.data[ATTR_RELATION_SOURCE] as string | undefined)
                : (item.data[ATTR_RELATION_TARGET] as string | undefined);
          }
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
        if (!item.core) {
          continue;
        }
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
    const sorted = [...ws].sort((itemA, itemB) => {
      for (const order of step.order) {
        const cmp = this._compareByOrder(itemA, itemB, order);
        if (cmp !== 0) {
          return cmp;
        }
      }
      return 0;
    });
    return step.limit !== undefined ? sorted.slice(0, step.limit) : sorted;
  }

  private _compareByOrder(itemA: WorkingSetItem, itemB: WorkingSetItem, order: QueryAST.Order): number {
    switch (order.kind) {
      case 'natural': {
        const posA = getQueuePosition(itemA);
        const posB = getQueuePosition(itemB);
        if (posA !== null && posB !== null) {
          const comparison = posA - posB;
          return order.direction === 'desc' ? -comparison : comparison;
        }
        if (posA === null && posB !== null) {
          return 1;
        }
        if (posA !== null && posB === null) {
          return -1;
        }
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
        const aVal = WorkingSetItem.getProperty(itemA, [order.property]);
        const bVal = WorkingSetItem.getProperty(itemB, [order.property]);
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
      queueId: null,
      queueNamespace: null,
      core,
      data: null,
    };
  }
}

const MAX_DEPTH_FOR_CHILD_OF_TRACING = 16;

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

const getQueuePosition = (item: WorkingSetItem): number | null => {
  const keys = item.data?.['@meta']?.keys;
  if (!Array.isArray(keys)) {
    return null;
  }
  const key = keys.find((foreignKey: ForeignKey) => foreignKey.source === FeedProtocol.KEY_QUEUE_POSITION);
  if (key && typeof key.id === 'string') {
    const parsed = Number.parseInt(key.id, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};
