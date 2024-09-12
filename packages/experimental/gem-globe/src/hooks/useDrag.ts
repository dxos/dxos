//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
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

    // TODO(burdon): Constrain by East/west.
    geoInertiaDrag(
      d3.select(canvas),
      () => {
        controller.setRotation(controller.projection.rotate());
        options.onUpdate?.({ type: 'move', controller });
      },
      controller.projection,
      {
        start: () => options.onUpdate?.({ type: 'start', controller }),
        finish: () => options.onUpdate?.({ type: 'end', controller }),
        time: 3_000,
      },
    );

    return () => {
      cancelDrag(d3.select(canvas));
    };
  }, [controller, options]);
};

const cancelDrag = (node) => node.on('.drag', null);
