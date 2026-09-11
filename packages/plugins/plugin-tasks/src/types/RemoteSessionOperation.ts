//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Hypergraph, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { RemoteSession } from '@dxos/types';

/**
 * Verbs for reflecting a coding-agent session into the graph.
 *
 * They exist to be called by a harness HOOK rather than by a model: a `mcp_tool` hook fires the
 * same call on every event it is bound to, with no judgment in between, so the write path has to be
 * idempotent and addressable by the one identifier every hook event carries — `sessionId`.
 */

/**
 * Creates the session on first sight and updates it thereafter, keyed on `sessionId`.
 *
 * One verb rather than create/update/finish: every field a finish would set is a field an update
 * sets, and a second writer for the same fields is how two hooks bound to different events end up
 * disagreeing about a session's state. `lastCheckedIn` is stamped on every call, which is what
 * makes a stale `running` session detectable.
 */
export const RecordSession = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.recordSession'),
    name: 'Record Session',
    description:
      'Create or update a coding-agent session by its harness session id. Stamps the check-in time; pass a terminal state to close it.',
    icon: 'ph--robot--regular',
  },
  // The graph, not `Database.Service`: declaring the database is what marks an operation as
  // requiring a space, and this one is invoked by a hook whose payload is fixed and cannot carry a
  // space id. The graph spans spaces, so the handler finds the session's own.
  services: [Hypergraph.Service],
  input: Schema.Struct({
    sessionId: Schema.String.annotate({
      description: "The harness session id, filed as the object's foreign key rather than a property.",
    }),
    spaceId: Schema.optional(Schema.String).annotate({
      description:
        'Space to record the session in. Omit it and the session is looked up across every space ' +
        'by its id: an already-registered session is updated where it lives, while an unregistered ' +
        'one cannot be placed and the call returns instructions to retry with this argument.',
    }),
    title: Schema.optional(Schema.String),
    state: Schema.optional(RemoteSession.State).annotate({
      description: 'Defaults to running on create; left unchanged on update when omitted.',
    }),
    /** Prose: what the session last did. Written from the `Stop` event's final assistant message. */
    lastMessage: Schema.optional(Schema.String),
    repo: Schema.optional(Schema.String),
    branch: Schema.optional(Schema.String),
    worktree: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    /** Absent when no space could be resolved; `instructions` then says what to do about it. */
    session: Schema.optional(Type.getSchema(RemoteSession.RemoteSession)),
    /** Echoed back because the id is a foreign key, not a field of the object. */
    sessionId: Schema.String,
    /** True when this call created the object, so a caller can tell a first report from a check-in. */
    created: Schema.Boolean,
    /**
     * What to do when nothing was written. A hook fires a fixed payload and cannot choose a space,
     * so an unregistered session is not an error — it is a call that needs one argument more, and
     * the model reading this result is the one that can supply it.
     */
    instructions: Schema.optional(Schema.String),
  }),
}).pipe(Operation.mutation('write'));

/** Reads the sessions in a space, newest first, so a reader can find stale `running` ones. */
export const ListSessions = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.tasks.listSessions'),
    name: 'List Sessions',
    description: 'List coding-agent sessions, newest first. Filter by state or by session id.',
    icon: 'ph--list-bullets--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    state: Schema.optional(RemoteSession.State),
    sessionId: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Page size (default 50, max 200).' }),
  }),
  output: Schema.Struct({
    /** Each row pairs the object with its foreign-key session id, which is not a field of it. */
    sessions: Schema.Array(
      Schema.Struct({
        sessionId: Schema.optional(Schema.String),
        session: Type.getSchema(RemoteSession.RemoteSession),
      }),
    ),
  }),
}).pipe(Operation.mutation('none'));
