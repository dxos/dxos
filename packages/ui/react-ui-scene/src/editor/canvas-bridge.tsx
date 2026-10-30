//
// Copyright 2026 DXOS.org
//

import { useEffect, useSyncExternalStore } from 'react';

import { type CanvasServices, useCanvasServices } from '@dxos/react-ui-canvas';

/**
 * The 2D viewport's canvas services, for the editor's parts drawn outside it (the Properties section sits beside the
 * viewport, not inside its `Canvas.Root`). One per 2D config, so each editor reads its own canvas.
 */
export type CanvasBridge = {
  get: () => CanvasServices | undefined;
  subscribe: (listener: () => void) => () => void;
  set: (services: CanvasServices | undefined) => void;
};

export const createCanvasBridge = (): CanvasBridge => {
  let current: CanvasServices | undefined;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (services) => {
      if (services !== current) {
        current = services;
        listeners.forEach((listener) => listener());
      }
    },
  };
};

/** Publishes the enclosing canvas's services while it is mounted. */
export const CanvasBridgeCapture = ({ bridge }: { bridge: CanvasBridge }) => {
  const services = useCanvasServices('CanvasBridgeCapture');
  useEffect(() => {
    bridge.set(services);
    return () => {
      bridge.get() === services && bridge.set(undefined);
    };
  }, [bridge, services]);
  return null;
};

/** The bridged canvas's services, or undefined while no 2D viewport is mounted. */
export const useBridgedCanvas = (bridge: CanvasBridge): CanvasServices | undefined =>
  useSyncExternalStore(bridge.subscribe, bridge.get);
