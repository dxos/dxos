# Spec: Activity-graph aggregate query (`Aggregate.dateBucket`)

## Goal

Wire the Space Home activity matrix (`Dashboard.Activity`) to ECHO via an
aggregate query that groups objects by their meta timestamp bucketed to a day
and counts them, instead of materialising one `ActivityDatum` per object on the
client.

## Background

The aggregate machinery already exists end-to-end: `Query.aggregate({...})` with
`Aggregate.group | max | min | items | count`, serialisable AST
(`QueryAST.GroupAggregate`), a planner `AggregateStep`, and two executors (host
index-backed `QueryExecutor`, client `WorkingSetQueryExecutor`) sharing
`GroupBy` (`packages/core/echo/echo-host/src/query/group-by.ts`).

The single gap: `group` partitions by a raw scalar data property; there is no
**time-bucketing** and no way to group by a **meta timestamp**
(`createdAt`/`updatedAt`), which is not a data property.

## API

A dedicated aggregate constructor, mirroring the `field: 'createdAt' |
'updatedAt'` naming already used by `Filter.updated/created` and the `timestamp`
`Order`:

```ts
Query.select(Filter.everything()).aggregate({
  day: Aggregate.dateBucket('updatedAt', { resolution: 'day' }),
  count: Aggregate.count(),
});
```

- `Aggregate.dateBucket(field, { resolution })` — a **grouping** aggregate (part
  of the composite key, like `group`).
  - `field: 'createdAt' | 'updatedAt'` — the meta timestamp.
  - `resolution: 'hour' | 'day' | 'week' | 'month'` — the bucket size.
  - Produces `number | null`: the bucket-start as unix ms (local-time floor),
    or `null` when the object has no such timestamp.

Chosen over the user's sketched `group('@meta.updatedAt', { resolution })`
because (1) `field: 'createdAt'|'updatedAt'` matches the existing timestamp
convention, (2) it keeps `group`'s `property: keyof T` typing clean, and (3) a
distinct kind reads clearly at aggregate call sites.

## Bucketing

`GroupBy.bucketTimestamp(tsMs, resolution)` floors using **local** `Date`
fields, matching `react-ui-dashboard`'s `buildCalendar` (local midnight, Monday-
first weeks). Local-first: host and client share a timezone, so this is
consistent with the UI. Weeks are Monday-first to match the calendar layout.

## Changes

Core AST / DSL:

- `echo-protocol/.../query/ast.ts` — add `GroupAggregateDateBucket_` to the
  `GroupAggregate_` union; extend the doc comment.
- `echo/src/Aggregate.ts` — `TimeResolution` type, `date-bucket` `Spec` variant,
  `dateBucket` constructor.
- `echo/src/internal/Query/pretty.ts` — pretty-print `date-bucket`.

Execution:

- `echo-host/.../query/group-by.ts` — `TimeResolution` + `bucketTimestamp`;
  `withGroupAggregates` stamps the group/date-bucket field value from the
  pre-computed `groupKey` (add `groupKey?` to the item constraint) so bucketing
  logic lives only in key computation.
- `echo-host/.../query/query-executor.ts` — `QueryItem.getGroupKey` handles
  `date-bucket` (reads `item.createdAt/updatedAt`, buckets).
- `echo-client/.../query/working-set-executor.ts` — `_execAggregateStep` bails
  (`return null`) when any aggregate is `date-bucket`; the client working set
  has no meta-timestamp index, so the index-backed source serves it (same
  fallback as `timestamp` filters/orders).
- `echo-client/.../query/query-result.ts` — `_assembleGroups` treats
  `date-bucket` like `group` (value spread from the source key);
  `_computeAggregate` gets a `date-bucket` case.

UI:

- `plugin-space/.../SpaceHomeDashboard.tsx` — activity matrix from the aggregate
  query (`{ date: new Date(row.day), value: row.count }`); derive `active-days`
  from the row count. Other stats keep the full-object query (they need
  per-object type info).

## Tests

- `Aggregate` / `pretty` round-trip for `dateBucket`.
- `group-by` `bucketTimestamp` for each resolution.
- Executor grouping-by-day count (client working-set bail + host grouping, or a
  direct executor/e2e test).
