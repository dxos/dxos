//
// Copyright 2026 DXOS.org
//

/**
 * The only two `DOMException` names that mean "the user (or an abort signal) stopped this",
 * rather than "the operation failed". WebAuthn raises `NotAllowedError` both when the prompt is
 * dismissed and when it times out; an aborted `AbortSignal` raises `AbortError`.
 */
const CANCELLATION_NAMES: ReadonlySet<string> = new Set(['NotAllowedError', 'AbortError']);

/** Bound so a malformed chain (or a self-referential `cause`) cannot spin. */
const MAX_CAUSE_DEPTH = 8;

/**
 * Marker a domain error sets to declare itself a user cancellation, so a generic reporter can
 * recognise it without depending on the package that defines it (e.g. `PasskeyError.Dismissed`,
 * which is raised for a dismissal the platform reported without a `DOMException`).
 */
export interface Cancellation {
  readonly cancellation: true;
}

const isMarked = (value: object): boolean => 'cancellation' in value && value.cancellation === true;

/**
 * Whether a thrown value is a cancellation rather than a genuine failure.
 *
 * Walks the `cause` chain because a domain error wraps the original `DOMException` — the
 * interactive ceremony that raised it sits several frames below the handler that reports it.
 * Only the two names above match, so every other `DOMException` stays an error.
 */
export const isCancellation = (error: unknown): boolean => {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== null && current !== undefined; ++depth) {
    if (typeof current === 'object' && isMarked(current)) {
      return true;
    }
    if (
      typeof DOMException !== 'undefined' &&
      current instanceof DOMException &&
      CANCELLATION_NAMES.has(current.name)
    ) {
      return true;
    }
    if (typeof current !== 'object' || !('cause' in current)) {
      return false;
    }
    const { cause } = current;
    if (cause === current) {
      return false;
    }
    current = cause;
  }

  return false;
};
