//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect, useState } from 'react';

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
  | { kind: 'row'; key: string; node: TreeNodeEntry; position: RowPosition }
  | { kind: 'end'; key: string };

/**
 * A row's place among its siblings, for `aria-posinset`/`aria-setsize`: a windowed tree mounts a
 * flat run of some rows, so assistive technology cannot infer either from the DOM.
 */
export type RowPosition = { posinset: number; setsize: number };

/** Key of the "append at the end" drop strip, namespaced like the header keys. */
export const END_UNIT_KEY = 'end:';

/** Splices group wrappers out so the machine sees their children as direct children of the group's parent. */
export const spliceGroups = <T extends { id: string }>(entries: TreeNodeEntry<T>[] = []): TreeNodeEntry<T>[] =>
  entries.flatMap((entry) => (entry.group ? spliceGroups(entry.children) : [entry]));

/**
 * The id the window measures a row against — the item's own, because that is what the row element
 * already carries as `data-object-id` and what the window reads back off the DOM.
 */
export const rowUnitId = (unit: RowUnit): string => (unit.kind === 'row' ? unit.node.id : unit.key);

/**
 * Flattens the visible entries into the rows the window would mount, or `undefined` when the tree
 * cannot be windowed.
 *
 * An open branch's children follow its row as rows of their own, since the window mounts a flat
 * run; a closed branch contributes its row alone.
 *
 * A repeated item id is the case it gives up on. The window keys a row's measured extent by the id
 * the row carries, so the same id twice would have each row read back the other's height — a row
 * measured, found to disagree and measured again, every commit. A tree that addresses one item at
 * two paths therefore renders whole.
 */
const indexSiblings = (entries: readonly TreeNodeEntry[] | undefined): Map<TreeNodeEntry, number> =>
  new Map(spliceGroups([...(entries ?? [])]).map((entry, index) => [entry, index]));

export const flattenRowUnits = (entries: readonly TreeNodeEntry[] | undefined): RowUnit[] | undefined => {
  const units: RowUnit[] = [];
  const ids = new Set<string>();

  // `siblings` indexes the collection's sibling list, which groups do not break up.
  const visit = (nodes: readonly TreeNodeEntry[] | undefined, siblings: Map<TreeNodeEntry, number>): boolean => {
    for (const node of nodes ?? []) {
      if (node.group) {
        units.push({ kind: 'header', key: `header:${node.value}`, label: node.props.label });
        if (!visit(node.children, siblings)) {
          return false;
        }
        continue;
      }
      if (ids.has(node.id)) {
        return false;
      }

      ids.add(node.id);
      const position = { posinset: (siblings.get(node) ?? 0) + 1, setsize: siblings.size };
      units.push({ kind: 'row', key: node.value, node, position });
      if (node.branch && node.open && !visit(node.children, indexSiblings(node.children))) {
        return false;
      }
    }

    return true;
  };

  return visit(entries, indexSiblings(entries)) ? units : undefined;
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
 * in the document and the virtualizer has to re-run once it is.
 */
export const useScroller = (
  treeRef: RefObject<HTMLElement | null>,
  scrollerRef: RefObject<HTMLElement | null> | undefined,
  enabled: boolean,
): HTMLElement | null => {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setScroller(null);
      return;
    }

    setScroller(scrollerRef?.current ?? findScrollParent(treeRef.current));
  }, [enabled, scrollerRef, treeRef]);

  return scroller;
};

/** A row's extent before measurement. Uniform, since the tree knows nothing about its consumer's rows. */
export const nominalExtents = { of: () => NOMINAL_ROW_EXTENT };
