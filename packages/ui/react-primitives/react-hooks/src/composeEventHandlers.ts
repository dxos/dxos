//
// Copyright 2026 DXOS.org
//

/**
 * Runs the consumer's handler first and skips ours when it called `preventDefault()`.
 * Zag's `mergeProps` always invokes both, so this stays for the parts that honour the skip.
 */
export const composeEventHandlers = <E extends { defaultPrevented: boolean }>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {},
) => {
  return (event: E) => {
    originalEventHandler?.(event);
    if (!checkForDefaultPrevented || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
};
