//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SpaceId } from '@dxos/keys';

import { type ToolFailure, failure } from './failure';

export const idParameter = Schema.optional(SpaceId).annotate({
  description:
    'Space to operate on. Required for any operation that acts on a space: nothing is inferred, ' +
    'and a call that names no space is refused rather than run somewhere arbitrary. Take the value ' +
    'from the caller, from whoami, or from a reference already in hand — never from guessing at ' +
    'space names. Omit it for an operation that does not act on a space, or when a reference ' +
    'argument already names the space it belongs to.',
});

/**
 * Resolves the target space for a tool call to the one the caller named, and to nothing else.
 *
 * Deliberately without a session default: the session's first space has no relationship to the
 * caller's task, so defaulting to it files work into an arbitrary space — and a listing tool is
 * how an agent is supposed to choose, not a fallback. `required` is what the operation itself says
 * ({@link view.requiresSpace}): a verb that acts on a space must be told which one, while a verb
 * that asks about the host runs without any.
 *
 * Empty is distinguished from omitted because overloading empty as unrestricted would invert a
 * host's filter exactly when it excluded everything.
 */
export const resolveId = (
  sessionSpaceIds: readonly string[] | undefined,
  spaceId: string | undefined,
  { required }: { required: boolean },
): Effect.Effect<SpaceId | undefined, ToolFailure, never> => {
  if (spaceId === undefined) {
    return required
      ? Effect.fail(
          failure(
            'invalid_request',
            'This operation acts on a space, so it needs one named: pass spaceId, or an argument ' +
              'referencing an object in the space. whoami lists the spaces this session can use.',
          ),
        )
      : Effect.succeed(undefined);
  }
  if (sessionSpaceIds != null && sessionSpaceIds.length === 0) {
    return Effect.fail(
      failure(
        'space_not_in_context',
        'No space is addressable in this session. Create or join a space, or re-authorize this ' +
          'connection with a space id.',
      ),
    );
  }
  if (!SpaceId.isValid(spaceId)) {
    return Effect.fail(failure('invalid_request', `Invalid spaceId: ${spaceId}`));
  }
  if (sessionSpaceIds != null && !sessionSpaceIds.includes(spaceId)) {
    return Effect.fail(
      failure(
        'space_not_in_context',
        `Space is not in the session context: ${spaceId}. The session was authorized for a fixed ` +
          'set of spaces; ask the user to re-authorize this connection including that space id.',
      ),
    );
  }
  return Effect.succeed(spaceId);
};

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
