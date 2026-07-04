//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LayoutResult, layout } from './layout';

/** Sub-pixel changes below this threshold (px) don't trigger a re-layout. */
const HEIGHT_EPSILON = 0.5;

export type MasonryLayout = LayoutResult & {
  /** Stable ref callback for the tile wrapper of `id` (measures + registers it). */
  getTileRef: (id: string) => (element: HTMLElement | null) => void;
  /** Live map of currently-mounted tile wrappers by id (for FLIP positioning). */
  nodes: RefObject<Map<string, HTMLElement>>;
};

export type UseMasonryLayoutOptions = {
  /** Ids of the items to lay out, in render order. */
  ids: readonly string[];
  columnCount: number;
  /** Available content width (px), net of scrollbar allowance. */
  containerWidth: number;
  gutterPx: number;
};

/**
 * Measures tile heights via a shared ResizeObserver and computes balanced column
 * positions. Heights are keyed by item id so reorders and removals reuse prior
 * measurements; a version counter re-runs the pure layout when a height changes.
 */
export const useMasonryLayout = ({
  ids,
  columnCount,
  containerWidth,
  gutterPx,
}: UseMasonryLayoutOptions): MasonryLayout => {
  const heights = useRef(new Map<string, number>());
  const nodes = useRef(new Map<string, HTMLElement>());
  const elementIds = useRef(new WeakMap<Element, string>());
  const refCallbacks = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const [version, setVersion] = useState(0);

  const observer = useMemo(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    return new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const id = elementIds.current.get(entry.target);
        if (!id) {
          continue;
        }
        // ResizeObserver types `target` as Element; we only ever observe HTMLElement tile wrappers,
        // whose border-box height (offsetHeight) is what the layout stacks.
        const height = (entry.target as HTMLElement).offsetHeight;
        const previous = heights.current.get(id);
        if (previous === undefined || Math.abs(previous - height) > HEIGHT_EPSILON) {
          heights.current.set(id, height);
          changed = true;
        }
      }
      if (changed) {
        setVersion((value) => value + 1);
      }
    });
  }, []);

  useEffect(() => () => observer?.disconnect(), [observer]);

  const getTileRef = useCallback(
    (id: string) => {
      let callback = refCallbacks.current.get(id);
      if (!callback) {
        callback = (element: HTMLElement | null) => {
          const previous = nodes.current.get(id);
          if (previous === element) {
            return;
          }
          if (previous) {
            observer?.unobserve(previous);
            elementIds.current.delete(previous);
          }
          if (element) {
            nodes.current.set(id, element);
            elementIds.current.set(element, id);
            observer?.observe(element);
          } else {
            nodes.current.delete(id);
          }
        };
        refCallbacks.current.set(id, callback);
      }
      return callback;
    },
    [observer],
  );

  const result = useMemo(() => {
    // Prune measurements/callbacks for ids no longer present so the maps track the
    // live item set.
    const present = new Set(ids);
    for (const id of heights.current.keys()) {
      if (!present.has(id)) {
        heights.current.delete(id);
      }
    }
    for (const id of refCallbacks.current.keys()) {
      if (!present.has(id)) {
        refCallbacks.current.delete(id);
      }
    }

    const tileHeights = ids.map((id) => heights.current.get(id) ?? 0);
    return layout({ heights: tileHeights, columnCount, containerWidth, gutterPx });
    // `version` re-runs layout when a measured height changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, columnCount, containerWidth, gutterPx, version]);

  return { ...result, getTileRef, nodes };
};
