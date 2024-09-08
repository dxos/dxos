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

export const useDrag = (controller: GlobeController, options: DragOptions = {}) => {
  useEffect(() => {
    if (!controller) {
      return;
    }

    const { getCanvas, projection, setRotation } = controller;
    const canvas = getCanvas();
    if (options.disabled) {
      cancelDrag(d3.select(canvas));
      return;
    }

    // TODO(burdon): Constrain by East/west.
    geoInertiaDrag(
      d3.select(canvas),
      () => {
        setRotation(projection.rotate());
        options.onUpdate?.({ type: 'move', controller });
      },
      projection,
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

// TODO(burdon): Factor out.
const cancelDrag = (node) => node.on('.drag', null);
