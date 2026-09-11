//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { type ForeignKey } from '@dxos/echo/Key';

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

/** The foreign system a session's identifier belongs to — the coding-agent harness itself. */
export const SOURCE = 'claude.ai/code';

/**
 * A coding-agent session — a Claude Code run — reflected into the graph so the work an agent is
 * doing is visible next to the work it was asked to do.
 *
 * The harness's session identifier is a **foreign key**, not a property: the session is a record
 * that lives in another system, and `Obj.getMeta().keys` is where ECHO already keeps that
 * correspondence — the same place sync provenance lives for every other imported object. It also
 * means a hook can address this object by the one identifier every hook event carries, through
 * `Filter.foreignKeys`, without a property whose uniqueness nothing enforces.
 *
 * `lastCheckedIn` is separate from `updated` for the reason the `unknown` state exists: a session
 * that stops reporting leaves `state: 'running'` behind forever, and only a heartbeat distinguishes
 * that from a session still working. A reader ages a session out on this field, never on `state`.
 */
export class RemoteSession extends Type.makeObject<RemoteSession>(DXN.make('org.dxos.type.remoteSession', '0.1.0'))(
  Schema.Struct({
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
    LabelAnnotation.set(['title']),
    // The harness's own mark rather than a generic robot: every session this type holds is reported
    // by Claude Code (`SOURCE`). An icon annotation is type-level, so a second harness would have to
    // make this per-object — `harnessIcon` already keys off the foreign key for the places that can.
    Annotation.IconAnnotation.set({ icon: 'px--anthropic--regular', hue: 'yellow' }),
  ),
) {}

/** The foreign key for a harness session id, as `Filter.foreignKeys` and `Obj.Meta` both take it. */
export const key = (sessionId: string): ForeignKey => ({ source: SOURCE, id: sessionId });

/**
 * Factory for {@link RemoteSession}, taking the harness session id and filing it as the object's
 * foreign key — the id is not a property, so it cannot be set any other way.
 */
export const make = ({
  sessionId,
  ...props
}: Obj.MakeProps<typeof RemoteSession> & { sessionId: string }): RemoteSession =>
  Obj.make(RemoteSession, { ...props, [Obj.Meta]: { keys: [key(sessionId)] } });

/** The harness session id this object stands for, read back off its foreign keys. */
export const getSessionId = (session: RemoteSession): string | undefined => Obj.getKeys(session, SOURCE).at(0)?.id;

/**
 * Display name for the harness a session belongs to, from the foreign key's `source`. The pill that
 * stands for a session says which harness it is, so the mapping cannot live in the UI: an actor whose
 * subject is a session is the only thing that knows, and a second harness must render as itself rather
 * than inherit Claude Code's name.
 */
export const harnessName = (session: RemoteSession): string | undefined => {
  const source = getSource(session);
  return source === undefined ? undefined : (HARNESS_NAMES[source] ?? source);
};

/** The foreign system this session belongs to — the harness that reported it. */
const getSource = (session: RemoteSession): string | undefined => Obj.getMeta(session).keys.at(0)?.source;

/**
 * The harness's own brand glyph, where one exists. Falls back to undefined rather than a generic
 * icon so the caller picks its own default — a pill and a card want different ones.
 */
export const harnessIcon = (session: RemoteSession): string | undefined => {
  const source = getSource(session);
  return source === undefined ? undefined : HARNESS_ICONS[source];
};

const HARNESS_NAMES: Record<string, string> = { [SOURCE]: 'Claude Code' };

const HARNESS_ICONS: Record<string, string> = { [SOURCE]: 'px--anthropic--regular' };

/** Terminal states: a session in one of these is not expected to check in again. */
export const isTerminal = (session: RemoteSession): boolean =>
  session.state === 'finished' || session.state === 'failed';
