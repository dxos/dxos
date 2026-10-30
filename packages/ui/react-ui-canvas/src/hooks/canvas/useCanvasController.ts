//
// Copyright 2026 DXOS.org
//

import { useMemo, useRef } from 'react';

import { type Timeline } from '@dxos/animation';
import { type Bounds, type Size } from '@dxos/scene';

import {
  type CameraMotion,
  type CanvasAtoms,
  type CanvasController,
  type CanvasHistory,
  type ControllerGrid,
  type LookHandlers,
  type Projection,
  type ViewFit,
  createCanvasController,
} from '../../engine/index.ts';
import { type NodeRegistry, type ViewStore } from '../../model/index.ts';
import { type useRegistry } from '../useRegistry.ts';

/** What the controller's commands read of the view when they run. */
export type CanvasControllerLive = {
  projection: Projection;
  baseProjection: Projection;
  timeline?: Timeline;
  onTimelineChange?: (timeline: Timeline) => void;
  nodeRegistry: NodeRegistry;
  readonly: boolean;
  grid: ControllerGrid;
  viewport: Size;
  inset: number;
  frame?: Bounds;
  camera: CameraMotion;
  fit: ViewFit;
  look: LookHandlers;
  history: CanvasHistory;
};

export type UseCanvasControllerOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  store: ViewStore;
  /** The view as this render has it. */
  live: CanvasControllerLive;
};

/** The canvas's controller, made once per canvas: its commands read the view as it is when they run (DESIGN.md §13). */
export const useCanvasController = ({ registry, atoms, store, live }: UseCanvasControllerOptions): CanvasController => {
  const liveRef = useRef(live);
  liveRef.current = live;
  return useMemo(
    () =>
      createCanvasController({
        registry,
        atoms,
        store,
        projection: () => liveRef.current.projection,
        baseProjection: () => liveRef.current.baseProjection,
        timeline: () => liveRef.current.timeline,
        onTimelineChange: () => liveRef.current.onTimelineChange,
        nodeRegistry: () => liveRef.current.nodeRegistry,
        readonly: () => liveRef.current.readonly,
        grid: () => liveRef.current.grid,
        viewport: () => liveRef.current.viewport,
        inset: () => liveRef.current.inset,
        frame: () => liveRef.current.frame,
        camera: () => liveRef.current.camera,
        fit: () => liveRef.current.fit,
        look: () => liveRef.current.look,
        history: () => liveRef.current.history,
      }),
    [registry, atoms, store],
  );
};
