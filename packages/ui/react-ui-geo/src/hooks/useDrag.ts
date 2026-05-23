//
// Copyright 2024 DXOS.org
//

import { select } from 'd3';
import { useEffect } from 'react';

import { type GlobeController } from '../components';
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

    geoInertiaDrag(
      select(canvas),
      () => {
        controller.setRotation(controller.projection.rotate());
        options.onUpdate?.({ type: 'move', controller });
      },
      controller.projection,
      {
        lockTilt: options.lockTilt,
        time: 3_000,
        start: () => options.onUpdate?.({ type: 'start', controller }),
        finish: () => options.onUpdate?.({ type: 'end', controller }),
      },
    );

    // TODO(burdon): Cancel drag timer.
    return () => {
      cancelDrag(select(canvas));
    };
  }, [controller, JSON.stringify(options)]);
};

const cancelDrag = (node) => node.on('.drag', null);
