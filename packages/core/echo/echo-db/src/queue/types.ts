//
// Copyright 2025 DXOS.org
//

/**
 * Client-side view onto an EDGE queue.
 */
export type Queue<T = object> = {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  append(items: T[]): void;
  delete(ids: string[]): void;
};
