//
// Copyright 2026 DXOS.org
//

import { type RefObject, useLayoutEffect } from 'react';

/** The height things last rendered at, kept on this device, so their next first render can reserve the space. */
export type HeightMemory = {
  get: (key: string) => number | undefined;
  set: (key: string, height: number) => void;
};

/** Entries kept at most; the least recently used go first. */
const MAX_HEIGHTS = 1_000;

/** How long a write waits, so a burst of resizes is one write. */
const SAVE_DELAY_MS = 1_000;

/** Creates the memory stored under `name`. Keys are hashed, so the store holds no content. */
export const createHeightMemory = (name: string): HeightMemory => {
  const storageKey = `org.dxos.height-memory.${name}`;
  let heights: Map<string, number> | undefined;
  let saving: ReturnType<typeof setTimeout> | undefined;

  const load = (): Map<string, number> => {
    if (!heights) {
      const stored = withStorage(() => JSON.parse(localStorage.getItem(storageKey) ?? '{}'));
      heights = new Map(
        Object.entries(typeof stored === 'object' && stored !== null ? stored : {}).flatMap(([id, height]) =>
          typeof height === 'number' ? [[id, height] as const] : [],
        ),
      );
    }
    return heights;
  };

  return {
    // Reading keeps an entry: what is still opened is not what goes first.
    get: (key) => {
      const store = load();
      const id = hash(key);
      const height = store.get(id);
      if (height !== undefined) {
        store.delete(id);
        store.set(id, height);
      }
      return height;
    },
    set: (key, height) => {
      const store = load();
      const id = hash(key);
      if (store.get(id) === height) {
        return;
      }
      store.delete(id);
      store.set(id, height);
      if (store.size > MAX_HEIGHTS) {
        const [oldest] = store.keys();
        if (oldest !== undefined) {
          store.delete(oldest);
        }
      }
      clearTimeout(saving);
      saving = setTimeout(
        () => withStorage(() => localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(store)))),
        SAVE_DELAY_MS,
      );
    },
  };
};

/** How long an element keeps the height reserved for it while its content arrives. */
const RESERVE_MS = 1_000;

/** Heights are remembered per width, in steps this wide: the same content is taller in a narrower column. */
const WIDTH_STEP = 32;

/**
 * Reserves the height `key` last rendered at, at this width if known, as `ref`'s minimum height while its content arrives, then
 * records the heights it renders at. A section whose content loads a moment after it mounts otherwise grows into it and
 * pushes everything below it down. No `key`, no reservation.
 */
export const useReservedHeight = (
  memory: HeightMemory,
  key: string | undefined,
  ref: RefObject<HTMLElement | null>,
) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || key === undefined) {
      return;
    }
    // At mount, the height it last rendered at whatever the width; observations then refine it by width. A column can
    // lay out at no width first, or settle its width while the content arrives (a companion opening beside the plank).
    let reserved = memory.get(key);
    let reservedFor: string | undefined;
    let released = false;
    const reserve = (height: number | undefined) => {
      reserved = height;
      // A minimum, so content already taller than it is unaffected.
      element.style.minHeight = height !== undefined ? `${height}px` : '';
    };
    reserve(reserved);
    const release = setTimeout(() => {
      released = true;
      element.style.minHeight = '';
    }, RESERVE_MS);
    // Observations arrive after layout and before paint, so the width costs no forced layout per element.
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize[0];
      if (!box || box.inlineSize === 0) {
        return;
      }
      const slot = `${key}@${Math.round(box.inlineSize / WIDTH_STEP)}`;
      if (!released && slot !== reservedFor) {
        reservedFor = slot;
        reserve(memory.get(slot) ?? reserved);
      }
      // While reserved, only a height past the reservation is the content's own.
      if (box.blockSize > 0 && (released || reserved === undefined || box.blockSize > reserved)) {
        const height = Math.round(box.blockSize);
        memory.set(slot, height);
        memory.set(key, height);
      }
    });
    observer.observe(element);
    return () => {
      clearTimeout(release);
      observer.disconnect();
      element.style.minHeight = '';
    };
  }, [memory, key, ref]);
};

/** Storage this device blocks, has filled or holds garbage in only costs the reserved heights. */
const withStorage = <T>(access: () => T): T | undefined => {
  try {
    return access();
  } catch (err) {
    if (
      err instanceof SyntaxError ||
      (err instanceof DOMException && (err.name === 'SecurityError' || err.name === 'QuotaExceededError'))
    ) {
      return undefined;
    }
    throw err;
  }
};

/** FNV-1a. */
const hash = (value: string): string => {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
};
