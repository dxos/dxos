//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { Bounds, Frac, Point, Scale } from '@dxos/gem-x';

import { Ellipse } from '../../model';
import { D3Callable, D3DragEvent, D3Selection } from '../../types';
import { BaseElement } from '../base';
import { DragElementProps, DrawElementProps, Mode, dragBounds, dragMove } from '../drag';
import { createFrame, drawFrame } from '../frame';

const createData = (scale: Scale, bounds: Bounds, center: boolean, snap: boolean): Ellipse => {
  const { x, y, width, height } = bounds;
  const pos: Point = center ? [x, y] : [x + width / 2, y + height / 2];
  const size = center ? [width, height] : [width / 2, height / 2];
  const [cx, cy] = scale.mapToModel(pos, snap);
  const [rx, ry] = scale.mapToModel(size, snap);
  return { cx, cy, rx, ry };
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

const drawBasicEllipse = (scale: Scale, onEdit, onMove): D3Callable => {
  return (group: D3Selection, { id, data, editable }) => {
    const { cx, cy, rx, ry } = data;

    // eslint-disable indent
    group.selectAll('ellipse').data([id]).join('ellipse')
      .call(selection => {
        if (editable) {
          selection
            .on('click', onEdit)
            .call(dragMove(onMove));
        }
      })
      .attr('cx', scale.mapToScreen(cx))
      .attr('cy', scale.mapToScreen(cy))
      .attr('rx', scale.mapToScreen(rx))
      .attr('ry', scale.mapToScreen(ry));
    // eslint-enable indent
  };
}

export const dragEllipse = ({ scale, onCancel, onCreate }: DragElementProps<Ellipse>): D3Callable => {
  return dragBounds(scale, (event: D3DragEvent, bounds: Bounds, commit?: boolean) => {
    // TODO(burdon): If shift then constain circle.
    const data = createData(scale, bounds, event.sourceEvent.metaKey, commit);
    const { rx, ry } = data;
    if (commit && (rx < 0.5 || ry < 0.5)) { // TODO(burdon): Zoom specific?
      onCancel();
    } else {
      onCreate('ellipse', data, commit);
    }
  });
};

export const drawEllipse = ({
  scale, group, element, data, mode, editable, onUpdate, onEdit
}: DrawElementProps<Ellipse>) => {
  // console.log('drawEllipse', JSON.stringify(data));
  const id = element?.id ?? '_'; // TODO(burdon): Pass in ID.

  // TODO(burdon): Avoid creating unnecessary closures.

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

  const handleResize = (bounds: Bounds, commit: boolean) => {
    const data = createData(scale, bounds, false, commit);
    onUpdate(element, data, commit);
  };

  group.call(group => {
    group.call(drawBasicEllipse(scale, onEdit, handleMove), { id, data, editable });
    group.call(drawFrame(handleMove, handleResize), {
      id: (mode === Mode.CREATE || mode === Mode.UPDATE) ? id : undefined,
      resize: mode === Mode.UPDATE,
      bounds: createBoundsFromData(scale, data)
    })
  });
};

//
//
//

// TODO(burdon): Each element has pointer to parent context for events.

// TODO(burdon): Move.
// TODO(burdon): Resize.
// TODO(burdon): Create.

const createEllipse = (scale: Scale): D3Callable => {
  return (group: D3Selection, element: BaseElement<Ellipse>) => {
    const { element: { data: { cx, cy, rx, ry } } } = element;

    // eslint-disable indent
    group.selectAll('ellipse').data(['_main_']).join('ellipse')
      // .call(selection => {
      //   if (editable) {
      //     selection
      //       .on('click', onEdit)
      //       .call(dragMove(onMove));
      //   }
      // })
      .attr('cx', scale.mapToScreen(cx))
      .attr('cy', scale.mapToScreen(cy))
      .attr('rx', scale.mapToScreen(rx))
      .attr('ry', scale.mapToScreen(ry));
    // eslint-enable indent
  };
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse
 */
export class EllipseElement extends BaseElement<Ellipse> {

  _ellipse = createEllipse(this.scale);
  _frame = createFrame(this.scale);

  createBounds = (scale: Scale): Bounds => {
    const { data: { cx, cy, rx, ry } } = this.element;
    return {
      x: scale.mapToScreen(Frac.add(cx, -rx)),
      y: scale.mapToScreen(Frac.add(cy, -ry)),
      width: scale.mapToScreen(Frac.multiply(rx, 2)),
      height: scale.mapToScreen(Frac.multiply(ry, 2))
    };
  };

  drag (): D3Callable {
    return group => group.call(d3.drag());
  }

  draw (): D3Callable {
    return group => {
      group.call(this._ellipse, group.datum());
      group.call(this._frame, group.datum(), true, true);
    }
  }
}
