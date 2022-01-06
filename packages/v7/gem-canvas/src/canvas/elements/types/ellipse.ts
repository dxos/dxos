//
// Copyright 2022 DXOS.org
//

import { Bounds, Frac, Point, Scale } from '@dxos/gem-x';

import { Ellipse } from '../../../model';
import { D3Callable, D3DragEvent } from '../../../types';
import {
  DragElementProps,
  DrawElementProps,
  Mode,
  dragBounds,
  dragMove
} from '../drag';
import {
  drawFrame,
  drawResizableFrame
} from '../frame';

const createData = (scale: Scale, bounds: Bounds, center: boolean, snap: boolean): Ellipse => {
  const { x, y, width, height } = bounds;
  const pos: Point = center ? [x, y] : [x + width / 2, y + height / 2];
  const size = center ? [width, height] : [width / 2, height / 2];
  const [cx, cy] = scale.mapPointToModel(pos);
  const [rx, ry] = scale.mapToModel(size, snap);
  // if (rx >= 1 && ry >= 1) {
  return { cx, cy, rx, ry };
  // }
};

const createBoundsFromData = (scale: Scale, data: Ellipse): Bounds => {
  const { cx, cy, rx, ry } = data;
  return {
    x: scale.mapToScreen(Frac.add(cx, -rx)),
    y: scale.mapToScreen(Frac.add(cy, -ry)),
    width: scale.mapToScreen(Frac.multiply(rx, 2)),
    height: scale.mapToScreen(Frac.multiply(ry, 2))
  };
};

export const dragEllipse = ({ scale, onCreate }: DragElementProps<Ellipse>): D3Callable => {
  return dragBounds((event: D3DragEvent, bounds: Bounds, commit?: boolean) => {
    // TODO(burdon): If shift then constain circle.
    const data = createData(scale, bounds, event.sourceEvent.metaKey, commit);
    if (data) {
      onCreate('ellipse', data, commit);
    }
  });
};

export const drawEllipse = ({
  scale, group, element, data, mode, editable, onUpdate, onEdit
}: DrawElementProps<Ellipse>) => {
  // console.log('drawEllipse', JSON.stringify(data));

  const handleMove = (delta: Point, commit: boolean) => {
    const [dx, dy] = scale.mapToModel(delta, commit);
    const { cx, cy, rx, ry } = data;

    // TODO(burdon): Snap if commit.
    onUpdate(element, {
      cx: Frac.add(cx, dx),
      cy: Frac.add(cy, dy),
      rx,
      ry
    }, commit);
  };

  const handleResize = (event: MouseEvent, bounds: Bounds, commit: boolean) => {
    const data = createData(scale, bounds, event.metaKey, commit);
    onUpdate(element, data, commit);
  };

  const drawBasicEllipse = () => {
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse
    const { cx, cy, rx, ry } = data;
    group.selectAll('ellipse').data([0]).join('ellipse')
      .call(selection => {
        if (editable) {
          selection
            .on('click', onEdit)
            .call(dragMove(handleMove));
        }
      })
      .attr('cx', scale.mapToScreen(cx))
      .attr('cy', scale.mapToScreen(cy))
      .attr('rx', scale.mapToScreen(rx))
      .attr('ry', scale.mapToScreen(ry));
  };

  switch (mode) {
    case Mode.CREATE:
    {
      const bounds = createBoundsFromData(scale, data);
      drawFrame(group, bounds);
      drawBasicEllipse();
      break;
    }

    case Mode.UPDATE:
    {
      const bounds = createBoundsFromData(scale, data);
      drawResizableFrame(group, bounds, handleMove, handleResize);
      drawBasicEllipse();
      break;
    }

    case Mode.HIGHLIGHT:
    {
      drawBasicEllipse();
      break;
    }

    case Mode.DEFAULT:
    default:
    {
      drawBasicEllipse();
      break;
    }
  }
};
