//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { Entity, type Obj } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { canvasViewAspect } from './view-state.ts';

/**
 * Whether this viewer docks a canvas's inspectors beside it or floats them over it: one choice per canvas, kept in the
 * canvas's view state, so it holds whether the canvas shows a 2D or a 3D scene.
 */
export const useInspectorDock = (
  canvas: Obj.Unknown,
): { docked: boolean; onDockedChange: (docked: boolean) => void } => {
  const contextId = Entity.getURI(canvas);
  const { floating = true } = useViewState(canvasViewAspect, contextId);
  const { update } = useViewStateActions(canvasViewAspect, contextId);
  const onDockedChange = useCallback(
    (docked: boolean) => update((state) => ({ ...state, floating: !docked })),
    [update],
  );
  return { docked: !floating, onDockedChange };
};
