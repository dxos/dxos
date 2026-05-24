//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { type GlobeController } from '../components';
import { type Vector } from './context';

export type WheelOptions = {
  disabled?: boolean;
  /**
   * Degrees of rotation per pixel of wheel delta.
   */
  sensitivity?: number;
  onUpdate?: (controller: GlobeController) => void;
};

const DEFAULT_SENSITIVITY = 0.25;

/**
 * Constrain mouse-wheel motion to globe rotation:
 * - vertical (deltaY) rotates around the globe's screen-X axis (tilt / phi).
 * - horizontal (deltaX) rotates around the globe's polar axis (spin / lambda).
 */
export const useWheel = (controller?: GlobeController | null, options: WheelOptions = {}) => {
  useEffect(() => {
    const canvas = controller?.canvas;
    if (!canvas || options.disabled) {
      return;
    }

    const sensitivity = options.sensitivity ?? DEFAULT_SENSITIVITY;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const [lambda, phi, gamma] = controller.rotation ?? [0, 0, 0];
      // Negate deltaY so the wheel matches the linear-drag Y convention
      // (downward motion brings the northern hemisphere into view).
      const next: Vector = [lambda + event.deltaX * sensitivity, phi - event.deltaY * sensitivity, gamma];
      controller.setRotation(next);
      options.onUpdate?.(controller);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [controller, options.disabled, options.sensitivity, options.onUpdate]);
};
