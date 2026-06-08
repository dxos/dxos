//
// Copyright 2024 DXOS.org
//

import { select } from 'd3';
import { useEffect } from 'react';

import { type GlobeController } from './context';
import { geoInertiaDrag } from '../util';

export type GlobeDragEvent = {
  type: 'start' | 'move' | 'end';
  controller: GlobeController;
};

export type DragOptions = {
  disabled?: boolean;
  duration?: number;
  /**
   * When true, drag is constrained to rotation around the polar (vertical)
   * axis only — i.e. longitude changes freely but the camera's tilt
   * (latitude / phi) stays pinned at whatever value the root's `rotation`
   * prop was initialised with. Useful for "earth-spinning-at-an-angle"
   * presentations where the inclination should not change.
   */
  lockTilt?: boolean;
  /**
   * Drag rotation mode:
   * - `linear` (default): direct pixel-to-Euler mapping (Δx → lambda,
   *   Δy → phi, gamma fixed at 0). Rotation is constrained to two axes;
   *   no roll. The dragged point does not track the cursor exactly.
   * - `versor`: quaternion-based rotation so that the dragged point
   *   follows the cursor exactly. May induce roll (gamma).
   */
  mode?: 'linear' | 'versor';
  /**
   * Degrees of rotation per pixel of drag, in linear mode. Default 0.25.
   */
  sensitivity?: number;
  onUpdate?: (event: GlobeDragEvent) => void;
};

/**
 * Allows user to drag globe.
 */
export const useDrag = (controller?: GlobeController | null, options: DragOptions = {}) => {
  useEffect(() => {
    const canvas = controller?.canvas;
    if (!canvas || options.disabled) {
      return;
    }

    const inertia = geoInertiaDrag(
      select(canvas),
      () => {
        controller.setRotation(controller.projection.rotate());
        options.onUpdate?.({ type: 'move', controller });
      },
      controller.projection,
      {
        lockTilt: options.lockTilt,
        mode: options.mode,
        sensitivity: options.sensitivity,
        // Zoom-driven gain: matches useWheel — degrees-per-pixel shrinks as the
        // globe gets larger on screen so the drag feel is consistent across zoom.
        getZoom: () => controller.zoom,
        time: 3_000,
        start: () => options.onUpdate?.({ type: 'start', controller }),
        finish: () => options.onUpdate?.({ type: 'end', controller }),
      },
    );

    return () => {
      cancelDrag(select(canvas));
      // Stop any in-flight inertia: otherwise its d3-timer keeps writing
      // through the (stable) setRotation closure into the live React state,
      // even after this effect has been replaced.
      inertia?.timer?.stop();
    };
  }, [controller, JSON.stringify(options)]);
};

const cancelDrag = (node) => node.on('.drag', null);
