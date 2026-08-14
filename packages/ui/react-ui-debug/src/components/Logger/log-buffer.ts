//
// Copyright 2026 DXOS.org
//

import { type LogEntry } from '@dxos/log';

import { type LevelName, type LogRecorder, composeFilter, startLogRecording } from './recorder';

export const DEFAULT_MAX_LINES = 1_000;

export type LogRow = { id: number; entry: LogEntry };

/**
 * Process-wide log buffer, deliberately outside React.
 *
 * The panel that displays these rows is a deck companion: closing it unmounts the tree. When the
 * buffer and the recorder lived in component state, that unmount disposed the recorder and discarded
 * every row, so the log only covered the time the panel happened to be open — useless for the case it
 * exists for, which is looking at what happened *before* you went looking. Keeping both here means
 * recording starts when the app starts and survives every open/close.
 *
 * Rows are exposed as an immutable snapshot so `useSyncExternalStore` can compare by identity; the
 * snapshot is rebuilt only when the buffer actually changes.
 */
class LogBuffer {
  #rows: LogRow[] = [];
  #files = new Set<string>();
  #fileSnapshot: string[] = [];
  #listeners = new Set<() => void>();
  #recorder: LogRecorder | undefined;
  #capacity = DEFAULT_MAX_LINES;
  #baseFilter = 'info';
  #fileLevels = new Map<string, LevelName>();
  #nextId = 0;
  #paused = false;

  get recording(): boolean {
    return this.#recorder !== undefined && !this.#paused;
  }

  get capacity(): number {
    return this.#capacity;
  }

  get baseFilter(): string {
    return this.#baseFilter;
  }

  /**
   * Begin recording. Idempotent, so both the plugin's startup hook and a mounting panel can call it
   * without either having to know whether the other ran first.
   */
  start(): void {
    if (this.#recorder) {
      return;
    }

    this.#recorder = startLogRecording(this.#effectiveFilter(), (entry, matched) => {
      const file = entry.meta?.F;
      if (file && !this.#files.has(file)) {
        this.#files.add(file);
        this.#fileSnapshot = [...this.#files].sort();
        this.#emit();
      }
      // Files are discovered even while paused (every entry is delivered regardless of the display
      // filter); only row capture stops, so resuming does not lose the file list.
      if (matched && !this.#paused) {
        this.#rows = [...this.#rows, { id: this.#nextId++, entry }].slice(-this.#capacity);
        this.#emit();
      }
    });
  }

  /** Release the log processor entirely. Rows are kept, so a later `start` resumes the same buffer. */
  stop(): void {
    this.#recorder?.dispose();
    this.#recorder = undefined;
    this.#emit();
  }

  /** Pause row capture without releasing the processor, so file discovery continues. */
  setPaused(paused: boolean): void {
    this.#paused = paused;
    this.#emit();
  }

  setCapacity(capacity: number): void {
    const normalized = Number.isFinite(capacity) && capacity >= 1 ? Math.floor(capacity) : DEFAULT_MAX_LINES;
    if (normalized === this.#capacity) {
      return;
    }

    this.#capacity = normalized;
    if (this.#rows.length > normalized) {
      this.#rows = this.#rows.slice(-normalized);
      this.#emit();
    }
  }

  setFilter(baseFilter: string, fileLevels: Map<string, LevelName>): void {
    this.#baseFilter = baseFilter;
    this.#fileLevels = new Map(fileLevels);
    this.#recorder?.setFilter(this.#effectiveFilter());
  }

  clear(): void {
    if (this.#rows.length === 0) {
      return;
    }

    this.#rows = [];
    this.#emit();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  // Bound so they can be passed directly to `useSyncExternalStore`.
  getRows = (): LogRow[] => this.#rows;
  getFiles = (): string[] => this.#fileSnapshot;
  getRecording = (): boolean => this.recording;

  /** Seed the file list from the module-load registry. */
  addFiles(files: readonly string[]): void {
    let changed = false;
    for (const file of files) {
      if (!this.#files.has(file)) {
        this.#files.add(file);
        changed = true;
      }
    }
    if (changed) {
      this.#fileSnapshot = [...this.#files].sort();
      this.#emit();
    }
  }

  #effectiveFilter(): string {
    return composeFilter(this.#baseFilter, this.#fileLevels);
  }

  #emit(): void {
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

export const logBuffer = new LogBuffer();
