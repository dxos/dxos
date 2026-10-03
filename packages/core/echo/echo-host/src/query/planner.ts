//
// Copyright 2025 DXOS.org
//

// Lightweight query planning types and the planner — no SQL, no hypercore, no protobuf.
// Exported via the `@dxos/echo-host/query` sub-path so workerd-compatible consumers can
// import QueryPlan and QueryPlanner without pulling in the heavy server-only executor.
export * from './errors.ts';
export * from './group-by.ts';
export * from './plan.ts';
export * from './query-planner.ts';
