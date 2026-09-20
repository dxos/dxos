//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type RefObject, useContext, useEffect, useMemo, useState } from 'react';

import { type SceneViewAtoms } from './atoms.ts';
import { type FreehandProjectionOptions, type Projection, createFreehandProjection } from './projection.ts';
import { type SceneStore } from './store.ts';
import { type Size } from './types.ts';

/** The view's atom registry; components read atoms through `useAtomValue` and write through this. */
export const useRegistry = () => useContext(RegistryContext);

export type UseSceneProjectionOptions = {
  store: SceneStore;
  atoms: SceneViewAtoms;
  createProjection?: (options: FreehandProjectionOptions) => Projection;
};

/** The projection of the scene at the head of the view's path; shared by the view and its panels. */
export const useSceneProjection = ({
  store,
  atoms,
  createProjection = createFreehandProjection,
}: UseSceneProjectionOptions): Projection => {
  const registry = useRegistry();
  const path = useAtomValue(atoms.path);
  const sceneId = path[path.length - 1];
  return useMemo(() => createProjection({ registry, store, sceneId }), [createProjection, registry, store, sceneId]);
};

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
