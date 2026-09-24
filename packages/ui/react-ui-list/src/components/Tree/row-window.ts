//
// Copyright 2026 DXOS.org
//

import { type RefObject, useLayoutEffect, useState } from 'react';

import { type Label } from '@dxos/react-ui';

import { type TreeNodeEntry } from './TreeContext.ts';

/**
 * A row's nominal extent before it has been measured, in pixels.
 *
 * One control tall, which is what a row with a plain heading comes out at. Only ever a starting
 * guess: the window measures each row it mounts and corrects the placement, so a consumer whose
 * rows are taller pays one correction rather than a permanently wrong scrollbar.
 */
const NOMINAL_ROW_EXTENT = 40;

/** What the tree hands the virtualizer: one entry per element the window mounts, in DOM order. */
export type RowUnit =
  | { kind: 'header'; key: string; label: Label }
  | { kind: 'row'; key: string; node: TreeNodeEntry }
  | { kind: 'end'; key: string };

/** The id the window measures a unit by, namespaced by kind so no item collides with a header or the end strip. */
export const rowUnitId = (unit: RowUnit): string => `${unit.kind}:${unit.key}`;

/**
 * Flattens the visible entries into the units the window would mount, closed by the "append at
 * the end" strip when `end` is set.
 */
export const flattenRowUnits = (entries: readonly TreeNodeEntry[] | undefined, { end = false } = {}): RowUnit[] => {
  const units: RowUnit[] = [];
  const visit = (nodes: readonly TreeNodeEntry[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.group) {
        units.push({ kind: 'header', key: node.value, label: node.props.label });
        visit(node.children);
      } else {
        units.push({ kind: 'row', key: node.value, node });
        if (node.branch && node.open) {
          visit(node.children);
        }
      }
    }
  };

  visit(entries);
  if (end) {
    units.push({ kind: 'end', key: '' });
  }

  return units;
};

/**
 * The nearest ancestor that scrolls, for a consumer that does not own its scroll container.
 *
 * `Tree` is mounted inside somebody else's scroller more often than not — a task list is scrolled
 * by the plank around it — and threading a ref down through every one of those would make
 * windowing a change to each consumer rather than a prop on this one.
 */
export const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  for (let cursor = element?.parentElement ?? null; cursor; cursor = cursor.parentElement) {
    const { overflowY } = getComputedStyle(cursor);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return cursor;
    }
  }

  return null;
};

/**
 * Resolves the element to window against: the one the consumer named, or the nearest that scrolls.
 *
 * Held as state rather than read into a ref, because the answer is only knowable after the tree is
 * in the document and the virtualizer has to re-run once it is. `undefined` until then, which the
 * tree renders as no rows rather than all of them; resolved before paint, so that frame never shows.
 */
export const useScroller = (
  treeRef: RefObject<HTMLElement | null>,
  scrollerRef: RefObject<HTMLElement | null> | undefined,
  enabled: boolean,
): HTMLElement | null | undefined => {
  const [scroller, setScroller] = useState<HTMLElement | null | undefined>(undefined);

  useLayoutEffect(() => {
    setScroller(enabled ? (scrollerRef?.current ?? findScrollParent(treeRef.current)) : null);
  }, [enabled, scrollerRef, treeRef]);

  return scroller;
};

/** A row's extent before measurement. Uniform, since the tree knows nothing about its consumer's rows. */
export const nominalExtents = { of: () => NOMINAL_ROW_EXTENT };
