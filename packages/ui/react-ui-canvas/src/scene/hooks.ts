//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type RefObject, useContext, useEffect, useState } from 'react';

import { type Size } from './types.ts';

/** The view's atom registry; components read atoms through `useAtomValue` and write through this. */
export const useRegistry = () => useContext(RegistryContext);

/** Content size of an element, tracked with a ResizeObserver. */
export const useViewport = (ref: RefObject<HTMLElement | null>): Size => {
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return viewport;
};

export type WheelHandler = (event: WheelEvent, pointer: { x: number; y: number }) => void;

/** Non-passive wheel listener with the pointer in element coordinates, so the page never scrolls. */
export const useWheel = (ref: RefObject<HTMLElement | null>, handler: WheelHandler) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      handler(event, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [ref, handler]);
};
