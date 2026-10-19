//
// Copyright 2026 DXOS.org
//

/**
 * Runs `open` for `key`, or returns the run already in flight for it, so an article that remounts while the member's
 * chat is still being made shares that open rather than making a second chat.
 */
export const shareInFlight = <T>(
  inFlight: Map<string, Promise<T>>,
  key: string,
  open: () => Promise<T>,
): Promise<T> => {
  const running = inFlight.get(key);
  if (running) {
    return running;
  }

  const started = open().finally(() => inFlight.delete(key));
  inFlight.set(key, started);
  return started;
};
