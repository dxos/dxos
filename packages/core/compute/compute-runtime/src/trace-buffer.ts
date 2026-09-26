//
// Copyright 2026 DXOS.org
//

import * as Trace from '@dxos/compute/Trace';

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
 * trying to re-define them. The value is therefore always copied through JSON,
 * never passed through by reference: a DOM node (e.g. a popover `anchor`) carries
 * framework expandos that reference back to it, and handing that graph to
 * `Obj.make` recursed until the stack overflowed. DOM nodes are replaced by a
 * short description and a repeated ancestor by a marker, so the copy is total.
 */
export const detachData = (data: unknown): unknown => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  return JSON.parse(JSON.stringify(data, cycleSafeReplacer()));
};

/** The marker a reference back to one of its own ancestors is written as. */
export const CIRCULAR = '[Circular]';

/**
 * A `JSON.stringify` replacer that writes DOM nodes as `<tag>`, a bigint as its digits, and a reference to an ancestor on
 * the current path as {@link CIRCULAR}. Tracks the path rather than every object seen, so a value
 * shared by two siblings is still written twice, as plain JSON would.
 */
const cycleSafeReplacer = () => {
  const ancestors: object[] = [];
  return function (this: unknown, _key: string, value: unknown): unknown {
    // `JSON.stringify` throws on a bigint, which would otherwise fail the whole trace write.
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (isDomNode(value)) {
      return `<${value.nodeName.toLowerCase()}>`;
    }
    // `this` is the holder of `value`; unwind the path to it before checking for a cycle.
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(value)) {
      return CIRCULAR;
    }
    ancestors.push(value);
    return value;
  };
};

const isDomNode = (value: object): value is { nodeName: string } =>
  typeof Node !== 'undefined' && value instanceof Node;
