//
// Copyright 2026 DXOS.org
//

import { type RefObject, useLayoutEffect, useRef } from 'react';

import { type Rect } from './layout';

const DURATION = 200;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export type UseFlipOptions = {
  /** Tile wrappers by id, kept live by the layout hook. */
  nodes: RefObject<Map<string, HTMLElement>>;
  /** Item ids in render order (aligned with `rects`). */
  ids: readonly string[];
  /** Target positions (aligned with `ids`). */
  rects: readonly Rect[];
  /** Disable to snap without animating (also skipped under reduced-motion). */
  enabled: boolean;
};

/**
 * Animates tile position changes with FLIP: tiles that moved between layouts
 * transition from their previous translate to the new one via the Web Animations
 * API; freshly-added tiles fade/scale in. Respects `prefers-reduced-motion`.
 */
export const useFlip = ({ nodes, ids, rects, enabled }: UseFlipOptions): void => {
  const previous = useRef(new Map<string, { x: number; y: number }>());

  useLayoutEffect(() => {
    const animate = enabled && !prefersReducedMotion();
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
  }, [nodes, ids, rects, enabled]);
};
