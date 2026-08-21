//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SpaceId } from '@dxos/keys';

import { type ToolFailure, failure } from './failure';

export const idParameter = Schema.optional(Schema.String).annotate({
  // The default exists so a read is cheap to issue, not so a write can skip choosing. It is
  // whichever space the session happens to list first — no relationship to the caller's task — so
  // an agent that treats "it defaulted" as "it picked the right one" files work into an arbitrary
  // space. Said plainly here because this description is ambient, while any project's rule about
  // which space to use lives in a skill the agent may never have loaded.
  description:
    'Space to operate on. Omitting it falls back to the first space in the session context (see ' +
    'whoami), which is an arbitrary choice, not an inferred one. Pass it explicitly whenever the ' +
    'call writes, and take the value from the caller or from a reference already in hand rather ' +
    'than guessing from space names.',
});

/**
 * Resolves the target space for a tool call against the session's space context.
 *
 * Empty is distinguished from omitted because overloading empty as unrestricted would invert a
 * host's filter exactly when it excluded everything.
 */
export const resolveId = (
  sessionSpaceIds: readonly string[] | undefined,
  spaceId: string | undefined,
): Effect.Effect<string, ToolFailure, never> => {
  if (sessionSpaceIds != null && sessionSpaceIds.length === 0) {
    return Effect.fail(
      failure(
        'space_not_in_context',
        'No space is addressable in this session. Create or join a space, or re-authorize this ' +
          'connection with a space id.',
      ),
    );
  }
  const resolved = spaceId ?? sessionSpaceIds?.[0];
  if (!resolved) {
    return Effect.fail(
      failure('invalid_request', 'No space in session context. Pass spaceId or re-authorize with a space id.'),
    );
  }
  if (!SpaceId.isValid(resolved)) {
    return Effect.fail(failure('invalid_request', `Invalid spaceId: ${resolved}`));
  }
  if (sessionSpaceIds != null && !sessionSpaceIds.includes(resolved)) {
    return Effect.fail(
      failure(
        'space_not_in_context',
        `Space is not in the session context: ${resolved}. The session was authorized for a fixed ` +
          'set of spaces; ask the user to re-authorize this connection including that space id.',
      ),
    );
  }
  return Effect.succeed(resolved);
};

/**
 * Resolves the target space for a call that may not need one.
 *
 * An operation declaring no database can still be space-addressed — `removeObjects` takes its
 * space from a reference argument, or from the session default — but one that asks about the host
 * rather than about its data (`queryPlugins`) must still answer where the session has no space at
 * all. Same rules as {@link resolveId} once anything names a space.
 */
export const resolveOptionalId = (
  sessionSpaceIds: readonly string[] | undefined,
  spaceId: string | undefined,
): Effect.Effect<string | undefined, ToolFailure, never> =>
  spaceId === undefined && (sessionSpaceIds == null || sessionSpaceIds.length === 0)
    ? Effect.succeed(undefined)
    : resolveId(sessionSpaceIds, spaceId);

/** `echo://<spaceId>/<entityId>`, or `echo:///<entityId>` when the reference is space-less. */
const ECHO_URI_PATTERN = /^echo:\/\/([^/]*)\/(.+)$/;

/** Whether this is a lone `{ '/': <uri> }` reference envelope rather than an ordinary object. */
const refUri = (record: Record<string, unknown>): string | undefined => {
  const uri = record['/'];
  return typeof uri === 'string' && Object.keys(record).length === 1 ? uri : undefined;
};

/**
 * Rewrites every space-less reference in a tool result to name the space it was resolved in.
 *
 * An operation serializes a same-space reference as `echo:///<id>`, which is unambiguous only
 * while the space is implied by the call. Over MCP it is not: the agent carries the envelope back
 * in a later call with no memory of where it came from, and a tool given no `spaceId` targets the
 * *first* space in the session — so a reference minted anywhere else resolves to nothing.
 *
 * Qualifying on the way out closes the loop: what the agent receives is what it can send back, and
 * {@link hintFromInput} reads the space straight off it. A reference that already names a space is
 * left alone, so a genuine cross-space reference is never silently re-homed.
 */
export const qualifyRefs = (
  value: unknown,
  spaceId: string,
  seen: WeakMap<object, unknown> = new WeakMap(),
): unknown => {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  // Keyed by the qualified counterpart, not merely visited: one envelope object reachable by two
  // paths must qualify on both, or the agent carries an unqualified reference back and it resolves
  // against the session default space.
  const qualified = seen.get(value);
  if (qualified !== undefined) {
    return qualified;
  }

  if (Array.isArray(value)) {
    // Registered before descending, so a cycle finds the copy being filled instead of recursing.
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const entry of value) {
      copy.push(qualifyRefs(entry, spaceId, seen));
    }
    return copy;
  }

  const record = value as Record<string, unknown>;
  const uri = refUri(record);
  if (uri !== undefined) {
    const match = ECHO_URI_PATTERN.exec(uri);
    const result = match && match[1] === '' ? { '/': `echo://${spaceId}/${match[2]}` } : record;
    seen.set(record, result);
    return result;
  }

  const copy: Record<string, unknown> = {};
  seen.set(record, copy);
  for (const [key, entry] of Object.entries(record)) {
    copy[key] = qualifyRefs(entry, spaceId, seen);
  }
  return copy;
};

/**
 * The space named by the reference arguments, when they agree on one.
 *
 * A reference argument that names a space *is* a statement of which space the call targets, and
 * after round-tripping an earlier result it is the only such statement the agent has. Without it
 * the call runs against the session default and the operation rejects the mismatch outright
 * ("Cross-space references are not yet supported"), which reads as a missing feature rather than a
 * missing argument.
 *
 * Disagreeing references yield nothing, leaving an explicit `spaceId` (or the session default) to
 * decide and the operation to reject a genuine cross-space reference on its own terms.
 */
export const hintFromInput = (input: unknown): string | undefined => {
  const spaces = new Set<string>();
  const walk = (value: unknown, seen: Set<unknown>): void => {
    if (value == null || typeof value !== 'object' || seen.has(value)) {
      return;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((entry) => walk(entry, seen));
      return;
    }
    const record = value as Record<string, unknown>;
    const uri = refUri(record);
    if (uri !== undefined) {
      const match = ECHO_URI_PATTERN.exec(uri);
      if (match && match[1] !== '') {
        spaces.add(match[1]);
      }
      return;
    }
    Object.values(record).forEach((entry) => walk(entry, seen));
  };
  walk(input, new Set());
  return spaces.size === 1 ? [...spaces][0] : undefined;
};
