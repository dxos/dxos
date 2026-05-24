//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { type GlobeController } from '../components';
import { type Vector } from './context';

export type WheelOptions = {
  disabled?: boolean;
  /**
   * Degrees of rotation per pixel of wheel delta (non-zoom gestures).
   */
  sensitivity?: number;
  /**
   * Zoom factor per pixel of pinch / ctrl+scroll delta. Applied exponentially
   * so equal pinch-in / pinch-out deltas cancel exactly. Default 0.01.
   */
  zoomSensitivity?: number;
  onUpdate?: (controller: GlobeController) => void;
};

const DEFAULT_SENSITIVITY = 0.25;
const DEFAULT_ZOOM_SENSITIVITY = 0.01;

/**
 * Map mouse-wheel / trackpad gestures to globe motion:
 * - Scroll (or two-finger pan on a trackpad) rotates the globe:
 *   deltaY → phi (tilt around screen-X), deltaX → lambda (polar spin).
 * - Pinch-to-zoom on a trackpad — and ctrl+scroll on a mouse — are
 *   delivered as `wheel` events with `ctrlKey: true`. Those are routed
 *   to `setZoom` instead so the gesture matches the user's intent.
 */
export const useWheel = (controller?: GlobeController | null, options: WheelOptions = {}) => {
  useEffect(() => {
    const canvas = controller?.canvas;
    if (!canvas || options.disabled) {
      return;
    }

    const sensitivity = options.sensitivity ?? DEFAULT_SENSITIVITY;
    const zoomSensitivity = options.zoomSensitivity ?? DEFAULT_ZOOM_SENSITIVITY;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        // Pinch-to-zoom on trackpads, or ctrl+scroll on a mouse. The
        // browser synthesises ctrlKey on pinch even when ctrl is not held.
        const factor = Math.exp(-event.deltaY * zoomSensitivity);
        controller.setZoom((zoom) => zoom * factor);
      } else {
        const [lambda, phi, gamma] = controller.rotation ?? [0, 0, 0];
        // Negate deltaY so the wheel matches the linear-drag Y convention
        // (downward motion brings the northern hemisphere into view).
        const next: Vector = [lambda + event.deltaX * sensitivity, phi - event.deltaY * sensitivity, gamma];
        controller.setRotation(next);
      }
      options.onUpdate?.(controller);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [controller, options.disabled, options.sensitivity, options.zoomSensitivity, options.onUpdate]);
};
