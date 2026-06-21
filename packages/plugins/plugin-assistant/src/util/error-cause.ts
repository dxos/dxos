//
// Copyright 2026 DXOS.org
//

/** Walk an error's `cause` chain and return the first value matching `predicate`. */
export const findInCause = <T>(error: unknown, predicate: (value: unknown) => value is T): T | undefined => {
  let current: unknown = error;
  // Guard against self-referential / cyclic `cause` chains so traversal always terminates.
  const visited = new Set<unknown>();
  while (current) {
    if (visited.has(current)) {
      break;
    }
    visited.add(current);
    if (predicate(current)) {
      return current;
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return undefined;
};
