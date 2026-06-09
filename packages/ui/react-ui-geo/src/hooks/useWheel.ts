//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { type GlobeController } from './context';
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
        // Read live zoom from controller.zoom (a getter on zoomRef.current)
        // and set the new value directly: useControlledState's functional
        // setter resolves against the prop, not the state, and passing a
        // function to controller.setZoom triggers the 200ms eased transition
        // intended for button clicks.
        const factor = Math.exp(-event.deltaY * zoomSensitivity);
        controller.setZoom(controller.zoom * factor);
      } else {
        // Read the live rotation off the projection (kept in sync by the
        // render effect). The React-state path can't be used here:
        // - `controller.rotation` is a snapshot captured by useImperativeHandle.
        // - `useControlledState`'s functional setter resolves `prev` against
        //   the latest *prop*, not the latest state, so each event would
        //   start from the initial rotation and just jitter around it.
        // Mutating the projection here matches how useDrag accumulates.
        // Both deltas are negated so the wheel feels like "natural scroll":
        // scrolling/swiping in a direction moves the globe content the same way.
        // Scale by 1/zoom so the gesture feels consistent at any zoom level
        // (a bigger on-screen globe needs smaller angular rotation per pixel).
        const [lambda, phi, gamma] = controller.projection.rotate() as Vector;
        const k = sensitivity / Math.max(controller.zoom, 0.1);
        const next: Vector = [lambda - event.deltaX * k, phi + event.deltaY * k, gamma];
        controller.projection.rotate(next);
        controller.setRotation(controller.projection.rotate() as Vector);
      }
      options.onUpdate?.(controller);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [controller, options.disabled, options.sensitivity, options.zoomSensitivity, options.onUpdate]);
};
