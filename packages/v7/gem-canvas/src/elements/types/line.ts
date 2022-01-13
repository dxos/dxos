//
// Copyright 2022 DXOS.org
//

import { Modifiers, ScreenBounds, Scale } from '@dxos/gem-x';

import { ElementType, Line } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { BaseElement } from '../base';

/**
 * Renderer.
 * @param scale
 */
const createLine = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: BaseElement<Line>) => {
    const { pos1, pos2 } = base.data;
    const [x1, y1] = scale.model.toPoint(pos1);
    const [x2, y2] = scale.model.toPoint(pos2);

    // TODO(burdon): Global click to select near line.
    // eslint-disable indent
    group
      .selectAll('line')
      .data(['_main_'])
      .join('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2);
    // eslint-enable indent
  };
};

/**
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Line, commit: boolean) => {
  if (commit) {
    const { pos1, pos2 } = data;
  }

  return data;
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line
 */
export class LineElement extends BaseElement<Line> {
  _main = createLine(this.scale);

  type = 'line' as ElementType;

  createData (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): Line {
    return undefined;
  }

  createBounds (): ScreenBounds {
    const { pos1, pos2 } = this.data;
    return undefined;
  }

  // TODO(burdon): Generic.
  draw (): D3Callable {
    return group => {
      group.call(this._main, group.datum());
    };
  }
}
