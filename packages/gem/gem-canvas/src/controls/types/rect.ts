//
// Copyright 2022 DXOS.org
//

import {
  D3Callable, D3Selection, Modifiers, FractionUtil, ScreenBounds, Point, Scale, Vertex, Vector
} from '@dxos/gem-core';

import { ElementType, Rect } from '../../model';
import { Control } from '../control';
import { dragMove } from '../drag';
import { createConectionHandles, createFrame, getConectionHandle } from '../frame';
import { createText } from './text';

/**
 * Renderer.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
 * @param scale
 */
const createRect = (scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<Rect>) => {
    const data = control.data;
    const { x, y, width, height } = scale.model.toBounds(data.bounds);
    const { text } = data;

    // eslint-disable indent
    group
      .selectAll('rect')
      .data(['main'])
      .join(enter => {
        return enter
          .append('rect')
          .call(selection => {
            // Drag.
            // TODO(burdon): Factor out common with ellipse.
            if (control.editable) {
              selection
                .call(dragMove((delta: Point, mod: Modifiers, commit?: boolean) => {
                  const { x: dx, y: dy } = scale.screen.toVertex(delta);
                  const { bounds: { x, y, width, height }, ...rest } = control.element.data;
                  const moved = {
                    x: FractionUtil.add(x, dx),
                    y: FractionUtil.add(y, dy),
                    width,
                    height
                  };

                  control.onSelect(true);
                  control.onUpdate({ bounds: commit ? scale.model.snapBounds(moved) : moved, ...rest }, commit);
                }).filter(event => control.draggable && !event.ctrlKey && !event.button));
            }
          });
      })
      .style('cursor', control.editable && control.draggable ? 'move' : undefined)
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);

    // TODO(burdon): Factor out.
    group
      .call(createText({
        editable: control.editing,
        bounds: { x, y, width, height },
        text: control.debug ? control?.element?.id.substring(0, 4) : text,
        onUpdate: (value: string) => {
          const { text, ...rest } = control.data;
          control.onUpdate({ text: value, ...rest }, true);
          control.onEdit(false);
        },
        onCancel: () => control.onEdit(false)
      }));
    // eslint-enable indent
  };
};

/**
 * Rect control.
 */
export class RectControl extends Control<Rect> {
  _main = createRect(this.scale);
  _frame = createFrame(this.scale);
  _connectors = createConectionHandles(this.scale);

  type = 'rect' as ElementType;

  override drawable: D3Callable = group => {
    const control = group.datum(); // TODO(burdon): Pattern.
    group.call(this._main, control);
    group.call(this._frame, control, this.selected, this.resizable);
    group.call(this._connectors, control, this.connections);
  };

  override getBounds (): ScreenBounds {
    const { bounds } = this.data;
    return this.scale.model.toBounds(bounds);
  }

  override checkBounds (data: Rect) {
    const { bounds: { width, height } } = data;
    return (FractionUtil.toNumber(width) >= 1 && FractionUtil.toNumber(height) >= 1);
  }

  override createFromBounds (bounds: ScreenBounds, mod?: Modifiers, snap?: boolean): Rect {
    if (snap) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    return {
      ...this.data,
      bounds: this.scale.screen.toBounds(bounds)
    };
  }

  override getConnectionPoint (handle?: string): Vertex {
    const center = Vector.center(this.data.bounds);
    if (!handle) {
      return center;
    }

    const { x, y } = center;
    const { width, height } = this.data.bounds;
    const { p } = getConectionHandle(handle);
    return {
      x: FractionUtil.add(x, FractionUtil.multiply(FractionUtil.toFraction(p[0]), FractionUtil.multiply(width, [1, 2]))),
      y: FractionUtil.add(y, FractionUtil.multiply(FractionUtil.toFraction(p[1]), FractionUtil.multiply(height, [1, 2])))
    };
  }
}
