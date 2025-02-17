/**
 * Client-side view onto an EDGE queue.
 */
export type Queue<T> = {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  append(items: T[]): void;
};
