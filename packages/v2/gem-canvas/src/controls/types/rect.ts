//
// Copyright 2022 DXOS.org
//

import { Modifiers, FractionUtil, ScreenBounds, Point, Scale, Screen, Vertex, Vector } from '@dxos/gem-core';

import { ElementType, Rect } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { Control } from '../control';
import { dragMove } from '../drag';
import { createConectionPoints, createFrame, getConectionHandle } from '../frame';
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
      .data(['_main_'])
      .join(enter => {
        return enter
          .append('rect')
          .call(selection => {
            // Drag.
            if (control.onUpdate) {
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
                  control.onUpdate({
                    bounds: commit ? scale.model.snapBounds(moved) : moved,
                    ...rest
                  }, commit);
                }).filter(() => control.draggable));
            }
          })
      })
      .attr('cursor', control.draggable ? 'move' : undefined)
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);

    group
      .call(createText({
        editable: control.editing,
        bounds: { x, y, width, height },
        text,
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
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Rect, commit: boolean) => {
  if (commit) {
    const { bounds: { width, height } } = data;
    if (FractionUtil.isZero(width) || FractionUtil.isZero(height)) {
      return;
    }
  }

  return data;
};

/**
 * Rect control.
 */
export class RectControl extends Control<Rect> {
  _frame = createFrame(this.scale);
  _connectors = createConectionPoints(this.scale);
  _main = createRect(this.scale);

  type = 'rect' as ElementType;

  override drawable: D3Callable = group => {
    group.call(this._main, group.datum());
    group.call(this._connectors, group.datum(), !this.editing && !this.selected && this.hover);
    group.call(this._frame, group.datum(), this.selected, this.selected && this.resizable);
  };

  override getBounds (): ScreenBounds {
    const { bounds } = this.data;
    return this.scale.model.toBounds(bounds);
  }

  override createFromBounds (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): Rect {
    if (commit) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    return valid({
      ...this.data,
      bounds: this.scale.screen.toBounds(bounds)
    }, commit);
  }

  getConnectionPoint (handle?: string): Vertex {
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
