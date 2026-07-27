//
// Copyright 2026 DXOS.org
//

import { type RefObject, useLayoutEffect, useRef } from 'react';

import { type Rect } from './layout';

const DURATION = 200;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/**
 * Above this many tiles added/removed in a single layout, snap instead of animate.
 * Reflows this large are the initial bulk render or a data swap, not an incremental
 * edit, and animating dozens of tiles at once is the source of the perf/bunching jank.
 */
const ANIMATE_MAX_DELTA = 8;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Decide whether a layout transition should animate. Animate only genuine small
 * incremental edits on a stable container: a resize snaps (the whole grid moves),
 * and a zero add/remove delta means either the initial bulk render's height-settling
 * pass or a pure resize — both snap so the grid never animates into place from the
 * degenerate all-heights-zero layout.
 */
export const shouldAnimateReflow = ({
  added,
  removed,
  resized,
  maxDelta = ANIMATE_MAX_DELTA,
}: {
  added: number;
  removed: number;
  resized: boolean;
  maxDelta?: number;
}): boolean => !resized && added + removed > 0 && added + removed <= maxDelta;

export type UseFlipOptions = {
  /** Tile wrappers by id, kept live by the layout hook. */
  nodes: RefObject<Map<string, HTMLElement>>;
  /** Item ids in render order (aligned with `rects`). */
  ids: readonly string[];
  /** Target positions (aligned with `ids`). */
  rects: readonly Rect[];
  /** Current column count; a change marks a resize, which snaps rather than animates. */
  columnCount: number;
  /** Current content width (px); a change marks a resize, which snaps rather than animates. */
  containerWidth: number;
  /** Disable to snap without animating (also skipped under reduced-motion and on bulk reflows). */
  enabled: boolean;
};

/**
 * Animates tile position changes with FLIP: tiles that moved between layouts
 * transition from their previous translate to the new one via the Web Animations
 * API; freshly-added tiles fade/scale in. Respects `prefers-reduced-motion`.
 */
export const useFlip = ({ nodes, ids, rects, columnCount, containerWidth, enabled }: UseFlipOptions): void => {
  const previous = useRef(new Map<string, { x: number; y: number }>());
  const previousLayout = useRef<{ columnCount: number; containerWidth: number } | null>(null);

  useLayoutEffect(() => {
    // Without committed positions this is the first non-empty layout — snap it (the initial
    // render), even for a small set that would otherwise read as a handful of added tiles.
    const hasPriorPositions = previous.current.size > 0;
    // Classify the reflow before recording new positions: added/removed relative to
    // the last rendered id set, and whether the container dimensions changed (resize).
    const idSet = new Set(ids);
    let added = 0;
    for (const id of ids) {
      if (!previous.current.has(id)) {
        added += 1;
      }
    }
    let removed = 0;
    for (const id of previous.current.keys()) {
      if (!idSet.has(id)) {
        removed += 1;
      }
    }
    const resized =
      previousLayout.current !== null &&
      (previousLayout.current.columnCount !== columnCount || previousLayout.current.containerWidth !== containerWidth);
    previousLayout.current = { columnCount, containerWidth };

    const animate =
      hasPriorPositions && enabled && !prefersReducedMotion() && shouldAnimateReflow({ added, removed, resized });
    const seen = new Set<string>();

    ids.forEach((id, index) => {
      const rect = rects[index];
      const element = nodes.current.get(id);
      if (!rect || !element) {
        return;
      }
      seen.add(id);

      const prior = previous.current.get(id);
      previous.current.set(id, { x: rect.x, y: rect.y });

      // Style already holds the target translate; snapping needs no animation.
      if (!animate) {
        return;
      }

      if (prior) {
        if (prior.x !== rect.x || prior.y !== rect.y) {
          element.animate(
            [
              { transform: `translate(${prior.x}px, ${prior.y}px)` },
              { transform: `translate(${rect.x}px, ${rect.y}px)` },
            ],
            { duration: DURATION, easing: EASING },
          );
        }
      } else {
        element.animate(
          [
            { opacity: 0, transform: `translate(${rect.x}px, ${rect.y}px) scale(0.98)` },
            { opacity: 1, transform: `translate(${rect.x}px, ${rect.y}px) scale(1)` },
          ],
          { duration: DURATION, easing: EASING },
        );
      }
    });

    // Forget positions for tiles no longer rendered.
    for (const id of previous.current.keys()) {
      if (!seen.has(id)) {
        previous.current.delete(id);
      }
    }
  }, [nodes, ids, rects, columnCount, containerWidth, enabled]);
};
