//
// Copyright 2026 DXOS.org
//

import { type RefObject, useLayoutEffect } from 'react';

/** The height things last rendered at this session, so their next first render can reserve the space. */
export type HeightMemory = {
  get: (key: string) => number | undefined;
  set: (key: string, height: number) => void;
};

/** Entries kept at most; the least recently used go first. */
const MAX_HEIGHTS = 1_000;

/** A height memory for the session, holding up to {@link MAX_HEIGHTS} entries. */
export const createHeightMemory = (): HeightMemory => {
  const heights = new Map<string, number>();
  return {
    // Reading keeps an entry: what is still opened is not what goes first.
    get: (key) => {
      const height = heights.get(key);
      if (height !== undefined) {
        heights.delete(key);
        heights.set(key, height);
      }
      return height;
    },
    set: (key, height) => {
      heights.delete(key);
      heights.set(key, height);
      if (heights.size > MAX_HEIGHTS) {
        const [oldest] = heights.keys();
        if (oldest !== undefined) {
          heights.delete(oldest);
        }
      }
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
      // The reservation this box was laid out under, which a new width's reservation replaces only for the next one.
      const laidOutUnder = reserved;
      if (!released && slot !== reservedFor) {
        reservedFor = slot;
        reserve(memory.get(slot) ?? reserved);
      }
      // While reserved, only a height past the reservation is the content's own.
      if (box.blockSize > 0 && (released || box.blockSize > Math.max(laidOutUnder ?? 0, reserved ?? 0))) {
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
