//
// Copyright 2026 DXOS.org
//

import { Trace } from '@dxos/functions';

/**
 * Compacting circular buffer of ephemeral trace events.
 *
 * Events with a stable `id` collapse in place: re-pushing an event with the
 * same `id` replaces the existing entry at its original position (removing
 * any duplicates that may have accumulated) rather than appending a new one.
 * Events without an `id` are appended. When the buffer exceeds `maxLength`,
 * the oldest entry is dropped.
 */
export class EphemeralTraceBuffer {
  readonly #maxLength: number;
  readonly #buffer: Trace.Message[] = [];

  constructor(maxLength: number = 25) {
    this.#maxLength = maxLength;
  }

  get buffer(): readonly Trace.Message[] {
    return this.#buffer;
  }

  push(event: Trace.Message): void {
    const id = typeof event.id === 'string' ? event.id : undefined;
    const buf = this.#buffer;
    if (id !== undefined) {
      let firstIdx = -1;
      for (let index = 0; index < buf.length; index++) {
        if (buf[index]!.id === id) {
          firstIdx = index;
          break;
        }
      }
      if (firstIdx !== -1) {
        let write = 0;
        for (let read = 0; read < buf.length; read++) {
          const item = buf[read]!;
          if (item.id === id) {
            if (read === firstIdx) {
              buf[write++] = event;
            }
          } else if (write !== read) {
            buf[write++] = item;
          } else {
            write++;
          }
        }
        buf.length = write;
        return;
      }
    }
    buf.push(event);
    if (buf.length > this.#maxLength) {
      buf.shift();
    }
  }

  clear(): void {
    this.#buffer.length = 0;
  }
}

/**
 * Detach a value from any ECHO proxy state so it can be safely embedded as
 * `Schema.Unknown` payload inside a freshly-created {@link Trace.Message}.
 *
 * ECHO objects already carry non-configurable schema metadata on nested
 * properties; `Obj.make` recurses into `Schema.Unknown` children and fails
 * trying to re-define them. We convert the value via JSON round-trip when
 * possible, falling back to the original reference if the value isn't
 * JSON-safe (circular refs, functions, etc.).
 */
export const detachData = (data: unknown): unknown => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
};
