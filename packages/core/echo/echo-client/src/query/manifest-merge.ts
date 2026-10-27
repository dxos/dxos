//
// Copyright 2026 DXOS.org
//

import { type AggregateValue, GroupBy } from '@dxos/echo-host/query';
import { PROPERTY_ID, QueryAST } from '@dxos/echo-protocol';
import { getDeep } from '@dxos/util';

import { getObjectCore, isEchoObject } from '../echo-handler/index.ts';
import { type SourceEntry } from './query-context.ts';

/** The scalar aggregates a remote collapses into one record per group, which a manifest lets local evidence adjust. */
export type ManifestPlan = { aggregates: readonly QueryAST.GroupAggregate[] };

const MEMBERS = '__members';

/**
 * The query with its members listed: the working set declines a bare scalar aggregate (a count of what one tab
 * holds is not a count of the space), but evaluates one that lists its members, which is what the adjustment
 * reads each local member's group from.
 */
export const withMembers = (query: QueryAST.Query): QueryAST.Query =>
  QueryAST.map(query, (node) =>
    node.type === 'aggregate'
      ? { ...node, aggregates: [...node.aggregates, { name: MEMBERS, kind: 'items' as const }] }
      : node,
  );

type ScalarAggregate = Extract<QueryAST.GroupAggregate, { kind: 'count' | 'sum' | 'min' | 'max' }>;

const isScalar = (aggregate: QueryAST.GroupAggregate): aggregate is ScalarAggregate =>
  aggregate.kind === 'count' || aggregate.kind === 'sum' || aggregate.kind === 'min' || aggregate.kind === 'max';

type Group = {
  key: Record<string, string | number | boolean | null>;
  count: number;
  aggregates: Record<string, AggregateValue>;
};

/**
 * Adjusts a remote's collapsed groups by what is loaded here. Each manifest member held locally gives up its
 * share, and each local match (`local`, the working set's members of the same aggregate) adds its own, so a
 * member written here counts once, in the group its local document places it in. `min` and `max` can widen
 * but not narrow: a held member that was the extreme leaves the value unverified. Undefined when some group
 * carries no manifest, which the remote leaves out over its budget.
 */
export const adjustGroups = (
  plan: ManifestPlan,
  remote: readonly SourceEntry[],
  local: readonly SourceEntry[],
  { held, survivor }: { held: (id: string) => boolean; survivor: (id: string) => string },
): { entries: SourceEntry[]; exact: boolean } | undefined => {
  const scalars = plan.aggregates.filter(isScalar);
  const groups = new Map<string, Group>();
  let exact = true;
  for (const entry of remote) {
    if (!entry.group?.aggregates || !entry.manifest) {
      return undefined;
    }
    const group: Group = { key: entry.group.key, count: entry.group.count, aggregates: { ...entry.group.aggregates } };
    for (const member of entry.manifest) {
      if (!held(survivor(member.id))) {
        continue;
      }
      const share = parseShare(member.contribution);
      group.count -= 1;
      for (const aggregate of scalars) {
        const current = group.aggregates[aggregate.name] ?? null;
        const value = share[aggregate.name] ?? null;
        switch (aggregate.kind) {
          case 'count':
            group.aggregates[aggregate.name] = typeof current === 'number' ? current - 1 : current;
            break;
          case 'sum':
            group.aggregates[aggregate.name] =
              typeof current === 'number' && typeof value === 'number' ? current - value : current;
            break;
          case 'min':
          case 'max':
            // The runner-up is not known here, so removing the extreme cannot be reflected.
            if (value !== null && value === current) {
              exact = false;
            }
            break;
        }
      }
    }
    groups.set(GroupBy.serializeGroupKey(entry.group.key), group);
  }

  for (const entry of local) {
    if (!entry.group || !isEchoObject(entry.result)) {
      continue;
    }
    const data = getObjectCore(entry.result).getObjectStructure()?.data;
    const serialized = GroupBy.serializeGroupKey(entry.group.key);
    let group = groups.get(serialized);
    if (!group) {
      group = { key: entry.group.key, count: 0, aggregates: initialAggregates(plan.aggregates, entry.group.key) };
      groups.set(serialized, group);
    }
    group.count += 1;
    for (const aggregate of scalars) {
      const current = group.aggregates[aggregate.name] ?? null;
      const value = aggregate.kind === 'count' ? 1 : propertyValue(entry.id, data, aggregate.property);
      switch (aggregate.kind) {
        case 'count':
          group.aggregates[aggregate.name] = (typeof current === 'number' ? current : 0) + 1;
          break;
        case 'sum':
          group.aggregates[aggregate.name] =
            (typeof current === 'number' ? current : 0) +
            (typeof value === 'number' && Number.isFinite(value) ? value : 0);
          break;
        case 'min':
        case 'max':
          group.aggregates[aggregate.name] = GroupBy.reduceAggregate([current, value], aggregate.kind);
          break;
      }
    }
  }

  const entries = [...groups.entries()]
    .filter(([, group]) => group.count > 0)
    .map(([id, group]): SourceEntry => ({
      id,
      match: { rank: 1 },
      resolution: { source: 'index', time: 0, verified: exact },
      group: { key: group.key, count: group.count, aggregates: group.aggregates },
    }));
  return { entries, exact };
};

/** A new group's values before its first member: the key fields, zero for counts and sums, nothing for extremes. */
const initialAggregates = (
  aggregates: readonly QueryAST.GroupAggregate[],
  key: Record<string, string | number | boolean | null>,
): Record<string, AggregateValue> =>
  Object.fromEntries(
    aggregates.map((aggregate) => [
      aggregate.name,
      aggregate.kind === 'count' || aggregate.kind === 'sum'
        ? 0
        : isScalar(aggregate)
          ? null
          : (key[aggregate.name] ?? null),
    ]),
  );

/** A manifest member's share, by aggregate name; anything that is not a scalar reads as missing. */
const parseShare = (text: string): Record<string, AggregateValue> => {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null) {
    return {};
  }
  return Object.fromEntries(Object.entries(parsed).map(([name, value]) => [name, asScalar(value)]));
};

const asScalar = (value: unknown): AggregateValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;

/** A member's value of an aggregate property, `id` read as the entity id as the executors read it. */
const propertyValue = (id: string, data: Record<string, unknown> | undefined, property: string): AggregateValue => {
  return asScalar(property === PROPERTY_ID ? id : getDeep(data, [property]));
};
