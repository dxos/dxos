//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

/**
 * `next`, with every subtree that equals the one at the same place in `previous` replaced by that
 * previous subtree, so unchanged values keep their identity across a new snapshot of an object.
 */
export const shareStructure = <T>(previous: unknown, next: T): T => share(previous, next) as T;

const share = (previous: unknown, next: unknown): unknown => {
  if (previous === next) {
    return previous;
  }
  if (previous instanceof A.RawString && next instanceof A.RawString) {
    return previous.toString() === next.toString() ? previous : next;
  }
  if (previous instanceof Uint8Array && next instanceof Uint8Array) {
    return previous.length === next.length && previous.every((byte, index) => byte === next[index]) ? previous : next;
  }
  if (Array.isArray(previous) && Array.isArray(next)) {
    const shared = next.map((item, index) => share(previous[index], item));
    return shared.length === previous.length && shared.every((item, index) => item === previous[index])
      ? previous
      : shared;
  }
  if (isRecord(previous) && isRecord(next)) {
    const keys = Object.keys(next);
    const shared = Object.fromEntries(keys.map((key) => [key, share(previous[key], next[key])]));
    return keys.length === Object.keys(previous).length && keys.every((key) => shared[key] === previous[key])
      ? previous
      : shared;
  }
  return next;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
