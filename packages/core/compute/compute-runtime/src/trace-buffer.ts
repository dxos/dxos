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
 * `Obj.make` recursed until the stack overflowed.
 *
 * The copy runs synchronously on every traced operation, so it is bounded: each
 * object is written once (a repeat becomes {@link SEEN}), and past
 * {@link MAX_DEPTH} levels or {@link MAX_NODES} objects the rest is
 * {@link TRUNCATED}. An unbounded walk of a large shared graph stalled the main
 * thread long enough to delay app work.
 */
export const detachData = (data: unknown): unknown => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  return JSON.parse(JSON.stringify(data, boundedReplacer()));
};

/** The marker an object already written elsewhere in the same value is replaced by. */
export const SEEN = '[Seen]';

/** The marker a value beyond the depth or size budget is replaced by. */
export const TRUNCATED = '[Truncated]';

/** Nesting deeper than this is truncated; trace payloads are for reading, not replay. */
export const MAX_DEPTH = 8;

/** Objects written per value before the rest is truncated. */
export const MAX_NODES = 1_000;

/**
 * A `JSON.stringify` replacer that writes DOM nodes as `<tag>`, a bigint as its digits, an object
 * already written as {@link SEEN} (which also breaks cycles), and anything past the depth or node
 * budget as {@link TRUNCATED}.
 */
const boundedReplacer = () => {
  const seen = new WeakSet<object>();
  const depths = new WeakMap<object, number>();
  let nodes = 0;
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
    if (seen.has(value)) {
      return SEEN;
    }
    const depth = (typeof this === 'object' && this !== null ? (depths.get(this) ?? 0) : 0) + 1;
    if (depth > MAX_DEPTH || nodes >= MAX_NODES) {
      return TRUNCATED;
    }
    nodes++;
    seen.add(value);
    depths.set(value, depth);
    return value;
  };
};

const isDomNode = (value: object): value is { nodeName: string } =>
  typeof Node !== 'undefined' && value instanceof Node;
