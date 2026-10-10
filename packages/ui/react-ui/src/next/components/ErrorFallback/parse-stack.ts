//
// Copyright 2026 DXOS.org
//

import ErrorStackParser from 'error-stack-parser';

// Kept out of `ErrorStack.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type ParsedStackFrame = ReturnType<typeof ErrorStackParser.parse>[number];

/**
 * Parses `captureOwnerStack()` output (React dev) into frames for {@link ErrorStack}.
 * Prefixes a synthetic Error line when needed so `error-stack-parser` can read V8-style stacks.
 */
export const parseCaptureOwnerStack = (stack: string | null): ParsedStackFrame[] | null => {
  if (stack == null || stack.length === 0) {
    return null;
  }

  const err = new Error();
  err.stack = stack;
  try {
    return ErrorStackParser.parse(err);
  } catch {
    err.stack = `Error\n${stack}`;
    try {
      return ErrorStackParser.parse(err);
    } catch {
      return null;
    }
  }
};
