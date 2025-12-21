//
// Copyright 2025 DXOS.org
//

import { select } from 'd3';
import { createEffect, onCleanup } from 'solid-js';

import { type GlobeController } from '../components';
import { geoInertiaDrag } from '../util';

export type GlobeDragEvent = {
  type: 'start' | 'move' | 'end';
  controller: GlobeController;
};

export type DragOptions = {
  disabled?: boolean;
  duration?: number;
  xAxis?: boolean; // TODO(burdon): Generalize.
  onUpdate?: (event: GlobeDragEvent) => void;
};

/**
 * Allows user to drag globe.
 */
export const useDrag = (controller?: GlobeController | null, options: DragOptions = {}) => {
  createEffect(() => {
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
        xAxis: options.xAxis,
        time: 3_000,
        start: () => options.onUpdate?.({ type: 'start', controller }),
        finish: () => options.onUpdate?.({ type: 'end', controller }),
      },
    );

    onCleanup(() => {
      cancelDrag(select(canvas));
    });
  });
};

const cancelDrag = (node) => node.on('.drag', null);
