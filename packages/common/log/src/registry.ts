//
// Copyright 2026 DXOS.org
//

/**
 * Registry of source files that use `@dxos/log`, populated at module load by the
 * `@dxos/vite-plugin-log` transform in development. Enables tooling (e.g. the Logger
 * panel) to enumerate log files and offer per-file level control. The registry owns
 * the file list only — levels are applied via the standard `@dxos/log` filter string.
 */
export interface LogFileRegistry {
  /** Register a file path (idempotent; notifies subscribers only when newly added). */
  register(file: string): void;
  /** Sorted copy of registered file paths. */
  getFiles(): string[];
  /** Subscribe to registry changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Remove all registered files (notifies subscribers). */
  clear(): void;
}

export const createLogFileRegistry = (): LogFileRegistry => {
  const files = new Set<string>();
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    register: (file) => {
      if (typeof file !== 'string' || file.length === 0 || files.has(file)) {
        return;
      }
      files.add(file);
      notify();
    },
    getFiles: () => [...files].sort(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => {
      files.clear();
      notify();
    },
  };
};

/**
 * Global singleton so all (possibly duplicated) copies of `@dxos/log` and the
 * transform-injected `globalThis.DX_LOG_FILES.register(...)` calls share one registry —
 * mirrors how `log` is `globalThis.DX_LOG`.
 */
export const logFileRegistry: LogFileRegistry = ((globalThis as any).DX_LOG_FILES ??= createLogFileRegistry());
