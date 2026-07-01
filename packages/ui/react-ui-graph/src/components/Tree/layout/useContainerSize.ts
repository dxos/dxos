//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Track an element's content-box size via ResizeObserver.
 * Returns the most recently observed `{ width, height }` plus a callback ref to attach to the element.
 *
 * Why not `react-resize-detector` directly: its `targetRef` API doesn't pick up a ref whose
 * `.current` is set later than the hook runs, and the returned-`ref` API forces the consumer to
 * forward a callback ref through their own component — which is awkward for class refs.
 * This hook returns a setter so the consumer assigns it directly to `<div ref={setRef}>`.
 */
export const useContainerSize = (): {
  setRef: (el: HTMLDivElement | null) => void;
  width: number;
  height: number;
} => {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);

  return { setRef: setEl, width: size.width, height: size.height };
};
