//
// Copyright 2026 DXOS.org
//

import { type RefObject, useLayoutEffect, useState } from 'react';

import { type Size } from '../model/types.ts';

/**
 * Content size of an element, tracked with a ResizeObserver. Measured in a layout effect so the
 * first paint already knows the size: a passive measurement paints one unfitted frame first.
 */
export const useViewport = (ref: RefObject<HTMLElement | null>): Size => {
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const update = (width: number, height: number) =>
      setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
    update(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      update(width, height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return viewport;
};
