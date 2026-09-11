//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LayoutResult, getColumnWidth, layout } from './layout.ts';

/** Sub-pixel changes below this threshold (px) don't trigger a re-layout. */
const HEIGHT_EPSILON = 0.5;

/** Assumed tile height (px) before any real measurement exists, so the first layout is spaced out. */
const ESTIMATED_TILE_HEIGHT = 280;

/**
 * Tile heights measured anywhere in the app, keyed by the caller's `cacheKey`, the tile id, and the
 * column width the tile was measured at. Module scope on purpose: a grid unmounts whenever its tab
 * or route does, and re-measuring from scratch is what makes a remount wait — hidden — for the
 * layout to settle. With a warm entry the first layout is already final, so the grid can be shown on
 * the first frame.
 *
 * The `cacheKey` scope is required rather than optional: tile ids default to the array index, so a
 * process-wide cache keyed on id alone would serve one grid's height for `"0"` to an unrelated grid
 * and reveal it before it was ever measured. A grid that passes no key keeps its heights to itself.
 *
 * Height is stored with its width because a card reflows: at a different width the entry is still a
 * far better estimate than the default, but it is not a measurement.
 */
const heightCache = new Map<string, { width: number; height: number }>();

/** Cap on remembered tiles; oldest are evicted first (insertion order). */
const HEIGHT_CACHE_LIMIT = 2_000;

/** Cache entries are namespaced by scope; `\u0000` cannot occur in an id or a caller's key. */
const scopedKey = (scope: string, id: string) => `${scope}\u0000${id}`;

const rememberHeight = (scope: string | undefined, id: string, width: number, height: number): void => {
  if (scope === undefined) {
    return;
  }
  const key = scopedKey(scope, id);
  // Re-insert so recently-seen tiles move to the end and survive eviction.
  heightCache.delete(key);
  heightCache.set(key, { width, height });
  if (heightCache.size > HEIGHT_CACHE_LIMIT) {
    const oldest = heightCache.keys().next();
    if (!oldest.done) {
      heightCache.delete(oldest.value);
    }
  }
};

/** Clears the shared height cache. Exported for tests and for callers that recycle ids. */
export const clearHeightCache = (): void => heightCache.clear();

export type MasonryLayout = LayoutResult & {
  /** True once every tile has a height measured at the current column width, so positions are final. */
  measured: boolean;
  /**
   * Ids the layout has some height for — measured now, or remembered from a previous mount or width.
   * Anything outside this set is sitting at a guess and should not be painted.
   */
  knownIds: ReadonlySet<string>;
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
  gapPx: number;
  /** Optional cap on column width (px). */
  maxColumnWidthPx?: number;
  /** Centre capped columns in the container (see `layout`). */
  centered?: boolean;
  /**
   * Scope for remembered tile heights, e.g. the collection's URI. Omit when ids are not stable and
   * unique across the app (the default index ids are not) — heights are then per-instance, and a
   * remount re-measures.
   */
  cacheKey?: string;
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
  gapPx,
  maxColumnWidthPx,
  centered,
  cacheKey,
}: UseMasonryLayoutOptions): MasonryLayout => {
  const heights = useRef(new Map<string, number>());
  // Survives pruning, unlike `heights`: when the item set is replaced wholesale (paging through
  // duplicate groups) every id is new, and without a remembered average the estimate would fall back
  // to the ~280px default and paint the swap hundreds of pixels out before the real heights land.
  const estimate = useRef(ESTIMATED_TILE_HEIGHT);
  const nodes = useRef(new Map<string, HTMLElement>());
  const elementIds = useRef(new WeakMap<Element, string>());
  const refCallbacks = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const [version, setVersion] = useState(0);
  // The observer is created once, so it reads the current column width and scope through refs.
  const widthRef = useRef(0);
  const scopeRef = useRef<string | undefined>(cacheKey);

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
          rememberHeight(scopeRef.current, id, widthRef.current, height);
          changed = true;
        }
      }
      if (changed) {
        const values = [...heights.current.values()];
        if (values.length > 0) {
          estimate.current = values.reduce((sum, value) => sum + value, 0) / values.length;
        }
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
            if (observer) {
              observer.observe(element);
            } else {
              // Without a ResizeObserver nothing would ever report a height, leaving every tile
              // hidden behind the estimate gate. One measurement at mount is worse than live
              // tracking, but it is a layout rather than a blank grid.
              heights.current.set(id, element.offsetHeight);
              rememberHeight(scopeRef.current, id, widthRef.current, element.offsetHeight);
              setVersion((value) => value + 1);
            }
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

  const columnWidth = Math.round(getColumnWidth({ columnCount, containerWidth, gapPx, maxColumnWidthPx }));
  widthRef.current = columnWidth;
  scopeRef.current = cacheKey;

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

    // Height for each tile, best source first: measured this mount, remembered at this exact column
    // width (as good as measured — the tile has not reflowed), remembered at some other width (a
    // close estimate, since content usually dominates), else the running average.
    const measuredIds = new Set<string>();
    const knownIds = new Set<string>();
    const tileHeights = ids.map((id) => {
      const measured = heights.current.get(id);
      if (measured !== undefined) {
        measuredIds.add(id);
        knownIds.add(id);
        return measured;
      }

      const cached = cacheKey === undefined ? undefined : heightCache.get(scopedKey(cacheKey, id));
      if (cached) {
        knownIds.add(id);
        if (cached.width === columnWidth) {
          measuredIds.add(id);
        }
        return cached.height;
      }

      return estimate.current;
    });

    return {
      ...layout({ heights: tileHeights, columnCount, containerWidth, gapPx, maxColumnWidthPx, centered }),
      measured: measuredIds.size === ids.length,
      knownIds,
    };
    // `version` re-runs layout when a measured height changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, columnCount, containerWidth, gapPx, maxColumnWidthPx, centered, columnWidth, cacheKey, version]);

  return { ...result, getTileRef, nodes };
};
