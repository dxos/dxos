//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type JsonlFileLogStoreOptions = {
  readonly path: string;
  /**
   * Timer-driven flush interval in milliseconds.
   * @default 100
   */
  readonly flushIntervalMs?: number;
  /**
   * Flush immediately when the in-memory batch reaches this size.
   * @default 200
   */
  readonly flushBatchSize?: number;
};

/**
 * Append-only NDJSON log store with in-memory batching.
 *
 * Node-side ingress for Vitest and other test harnesses. Worker-side bridges
 * (e.g. Miniflare tail workers) can call {@link pushLines} with pre-serialized lines.
 */
export class JsonlFileLogStore {
  readonly path: string;
  readonly #flushBatchSize: number;
  readonly #flushIntervalMs: number;
  #lines: string[] = [];
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor({ path, flushIntervalMs = 100, flushBatchSize = 200 }: JsonlFileLogStoreOptions) {
    this.path = path;
    this.#flushIntervalMs = flushIntervalMs;
    this.#flushBatchSize = flushBatchSize;
    this.#timer = setInterval(() => this.flush(), this.#flushIntervalMs);
    this.#timer.unref?.();
  }

  /**
   * Append one or more JSONL lines (without trailing newlines).
   */
  pushLines(lines: readonly string[]): void {
    for (const line of lines) {
      const trimmed = line.endsWith('\n') ? line.slice(0, -1) : line;
      if (trimmed.length > 0) {
        this.#lines.push(trimmed);
      }
    }
    if (this.#lines.length >= this.#flushBatchSize) {
      this.flush();
    }
  }

  pushLine(line: string): void {
    this.pushLines([line]);
  }

  /**
   * Flush buffered lines to disk.
   */
  flush(): void {
    if (this.#lines.length === 0) {
      return;
    }
    mkdirSync(dirname(this.path), { recursive: true });
    const payload = `${this.#lines.join('\n')}\n`;
    this.#lines = [];
    appendFileSync(this.path, payload);
  }

  /**
   * Flush pending lines and stop the flush timer.
   */
  close(): void {
    this.flush();
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }
}
