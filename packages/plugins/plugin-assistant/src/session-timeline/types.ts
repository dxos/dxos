//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const LaneKind = Schema.Literals(['session', 'task']);
export type LaneKind = Schema.Schema.Type<typeof LaneKind>;

export const LaneStatus = Schema.Literals(['pending', 'blocked', 'running', 'review', 'done', 'failed']);
export type LaneStatus = Schema.Schema.Type<typeof LaneStatus>;

export const TokenUsage = Schema.Struct({
  input: Schema.Number,
  output: Schema.Number,
  total: Schema.Number,
});
export type TokenUsage = Schema.Schema.Type<typeof TokenUsage>;

/**
 * Node in the supervisor lane a child session was spawned from, so the connector can start at the
 * exact marker rather than at the lane's edge.
 */
export const DelegationSource = Schema.Struct({
  laneId: Schema.String,
  markerId: Schema.String,
});
export type DelegationSource = Schema.Schema.Type<typeof DelegationSource>;

/**
 * One row of the timeline: a session (supervisor or delegated sub-agent) rendered as a box spanning
 * `start`..`end`, or a task rendered as a thin line grouped under its session.
 */
export const Lane = Schema.Struct({
  id: Schema.String,
  kind: LaneKind,
  label: Schema.String,
  status: LaneStatus,
  /** Epoch ms. */
  start: Schema.optional(Schema.Number),
  end: Schema.optional(Schema.Number),
  parentId: Schema.optional(Schema.String),
  chatId: Schema.optional(Schema.String),
  taskId: Schema.optional(Schema.String),
  pid: Schema.optional(Schema.String),
  /** Lane ids this lane waits on (task dependencies). */
  blockedOn: Schema.optional(Schema.Array(Schema.String)),
  delegatedFrom: Schema.optional(DelegationSource),
  tokens: Schema.optional(TokenUsage),
  toolCalls: Schema.optional(Schema.Number),
});
export type Lane = Schema.Schema.Type<typeof Lane>;

export const MarkerKind = Schema.Literals(['request', 'operation', 'tool', 'message', 'error', 'delegation', 'task']);
export type MarkerKind = Schema.Schema.Type<typeof MarkerKind>;

export const MarkerLevel = Schema.Literals(['info', 'warn', 'error']);
export type MarkerLevel = Schema.Schema.Type<typeof MarkerLevel>;

/**
 * A point event on a lane, rendered as a node inside the session box.
 */
export const Marker = Schema.Struct({
  id: Schema.String,
  laneId: Schema.String,
  kind: MarkerKind,
  timestamp: Schema.Number,
  label: Schema.String,
  level: Schema.optional(MarkerLevel),
  pid: Schema.optional(Schema.String),
  detail: Schema.optional(Schema.Unknown),
});
export type Marker = Schema.Schema.Type<typeof Marker>;

export const TimeRange = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
});
export type TimeRange = Schema.Schema.Type<typeof TimeRange>;

export const SessionTimeline = Schema.Struct({
  lanes: Schema.Array(Lane),
  markers: Schema.Array(Marker),
  range: TimeRange,
});
export type SessionTimeline = Schema.Schema.Type<typeof SessionTimeline>;
