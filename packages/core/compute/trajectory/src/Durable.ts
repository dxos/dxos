//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Obj, type Ref } from '@dxos/echo';
import { ContentBlock } from '@dxos/types';

import * as Reducer from './Reducer.ts';
import * as Trajectory from './Trajectory.ts';

/**
 * A reducer whose state can be stored, so a reader resumes from a saved checkpoint instead of refolding the feed.
 */
export interface Durable<S> extends Reducer.Reducer<S> {
  /** Names the reducer and its state shape; a stored checkpoint under a different id is never read back. */
  readonly id: string;
  readonly schema: Schema.Codec<S, unknown>;
  /** Points decoded refs at a database, since a stored ref keeps its URI but not what resolves it. */
  readonly rebind?: (state: S, makeRef: MakeRef) => S;
}

export type MakeRef = <T extends Obj.Unknown>(ref: Ref.Ref<T>) => Ref.Ref<T>;

const EventIds = Schema.Array(Trajectory.EventId);

const SessionState = Schema.Struct({
  queue: EventIds,
  alarms: Schema.Array(
    Schema.Struct({ id: Trajectory.EventId, wakeAt: Schema.Number, message: Schema.optional(Schema.String) }),
  ),
  skills: Trajectory.ContextBind.fields.skills,
  objects: Trajectory.ContextBind.fields.objects,
  background: Schema.Array(Schema.Struct({ toolCallId: Schema.String, pid: Schema.optional(Schema.String) })),
  threads: Schema.Array(
    Schema.Struct({
      id: Trajectory.EventId,
      mode: Trajectory.ThreadMode,
      status: Schema.Literals(['open', 'merged', 'completed', 'failed', 'cancelled']),
    }),
  ),
  model: Schema.optional(Trajectory.ModelChange.fields.model),
  turns: EventIds,
  rejected: EventIds,
});

const ThreadView = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Trajectory.EventId,
      sender: Trajectory.Sender,
      blocks: Schema.Array(ContentBlock.Any),
      created: Schema.String,
      thread: Schema.optional(Trajectory.EventId),
      status: Schema.Literals(['queued', 'consumed', 'cancelled', 'sent', 'rewound']),
    }),
  ),
});

const PromptEntry = Schema.Struct({
  role: Trajectory.Role,
  name: Schema.optional(Schema.String),
  blocks: Schema.Array(ContentBlock.Any),
  source: EventIds,
  at: Schema.Number,
});

const PromptState = Schema.Struct({
  entries: Schema.Array(PromptEntry),
  held: Schema.Record(Schema.String, PromptEntry),
  threads: Schema.Record(
    Schema.String,
    Schema.Struct({
      parent: Schema.optional(Trajectory.EventId),
      fresh: Schema.Boolean,
      seen: Schema.Number,
      closed: Schema.optional(Schema.Boolean),
      entries: Schema.Array(PromptEntry),
    }),
  ),
  position: Schema.Number,
  positions: Schema.Record(Schema.String, Schema.Number),
  stale: Schema.Record(Schema.String, EventIds),
  origin: Schema.optional(Trajectory.ThreadOrigin),
});

export const session: Durable<Reducer.SessionState> = {
  ...Reducer.session,
  id: 'session@1',
  schema: SessionState,
  rebind: (state, makeRef) => ({
    ...state,
    skills: state.skills.map((ref) => makeRef(ref)),
    objects: state.objects.map((ref) => makeRef(ref)),
  }),
};

export const thread: Durable<Reducer.ThreadView> = { ...Reducer.thread, id: 'thread@1', schema: ThreadView };

export const prompt: Durable<Reducer.PromptState> = {
  ...Reducer.prompt,
  id: 'prompt@1',
  schema: PromptState,
  rebind: (state, makeRef) =>
    state.origin?.feed ? { ...state, origin: { ...state.origin, feed: makeRef(state.origin.feed) } } : state,
};
