//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

/**
 * Where a session is in its life. `running` and `finished` are the two the harness can report on
 * its own; `failed` records a session that ended without completing its work, and `unknown` is the
 * honest state for a session whose host went away — a cloud container reclaimed mid-run fires no
 * close event, so a reader must be able to tell "still working" from "we stopped hearing".
 */
export const State = Schema.Literals(['running', 'finished', 'failed', 'unknown']);
export type State = Schema.Schema.Type<typeof State>;

export const StateOptions: { id: State; title: string; color: string; icon: string }[] = [
  { id: 'running', title: 'Running', color: 'sky', icon: 'ph--play-circle--regular' },
  { id: 'finished', title: 'Finished', color: 'green', icon: 'ph--check-circle--regular' },
  { id: 'failed', title: 'Failed', color: 'rose', icon: 'ph--x-circle--regular' },
  { id: 'unknown', title: 'Unknown', color: 'gray', icon: 'ph--question--regular' },
];

/**
 * A coding-agent session — a Claude Code run — reflected into the graph so the work an agent is
 * doing is visible next to the work it was asked to do.
 *
 * `sessionId` is the foreign key: it is the harness's own session identifier, which every hook
 * event carries, so a hook can address this object without first looking it up by anything softer
 * than an id.
 *
 * `lastCheckedIn` is separate from `updated` for the reason the `unknown` state exists: a session
 * that stops reporting leaves `state: 'running'` behind forever, and only a heartbeat distinguishes
 * that from a session still working. A reader ages a session out on this field, never on `state`.
 */
export class RemoteSession extends Type.makeObject<RemoteSession>(DXN.make('org.dxos.type.remoteSession', '0.1.0'))(
  Schema.Struct({
    /** Harness session identifier; the foreign key every hook event carries. */
    sessionId: Schema.String.annotate({ title: 'Session ID' }),

    /** Human-readable name for the run — normally the task it was started for. */
    title: Schema.optional(Schema.String.annotate({ title: 'Title' })),

    state: State.annotate({ title: 'State' }),

    /**
     * What the session last said it was doing, in prose. Written from the harness `Stop` event,
     * whose payload carries the turn's final assistant message — the cheapest honest summary
     * available without reading the transcript.
     */
    lastMessage: Schema.optional(Schema.String.annotate({ title: 'Last message' })),

    started: Format.DateTime.annotate({ title: 'Started' }),

    /** Last time the session reported in; how a stale `running` session is detected. */
    lastCheckedIn: Schema.optional(Format.DateTime.annotate({ title: 'Last check-in' })),

    /** When the session reached a terminal state; unset while it is still running. */
    finished: Schema.optional(Format.DateTime.annotate({ title: 'Finished' })),

    /** Where the session is working — repository, branch and worktree, when it has them. */
    repo: Schema.optional(Schema.String.annotate({ title: 'Repository' })),
    branch: Schema.optional(Schema.String.annotate({ title: 'Branch' })),
    worktree: Schema.optional(Schema.String.annotate({ title: 'Worktree' })),
  }).pipe(
    Schema.annotate({ title: 'Remote Session' }),
    LabelAnnotation.set(['title', 'sessionId']),
    Annotation.IconAnnotation.set({ icon: 'ph--robot--regular', hue: 'indigo' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link RemoteSession}. */
export const make = (props: Obj.MakeProps<typeof RemoteSession>): RemoteSession => Obj.make(RemoteSession, props);

/** Terminal states: a session in one of these is not expected to check in again. */
export const isTerminal = (session: RemoteSession): boolean =>
  session.state === 'finished' || session.state === 'failed';
