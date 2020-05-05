//
// Copyright 2020 DxOS, Inc.
//

import get from 'lodash.get';

import { value } from '@dxos/gem-core';

import { Layout } from './layout';

/**
 * Layout nodes in random positions.
 */
export class RandomLayout extends Layout {

  _onUpdate(grid, data) {
    const center = value(this._options.center)(grid);
    const radius = value(this._options.radius)(grid);
    const nodeRadius = get(this._options, 'node.radius', grid.scaleX(5));
    const { snap } = this._options;

    const snapper = p => snap ? grid.snap(p) : p;

    const { nodes = [] } = data;
    nodes.forEach(node => {
      const { x, y } = snapper({
        x: center.x + (Math.random() - .5) * radius,
        y: center.y + (Math.random() - .5) * radius
      });

      Object.assign(node, {
        layout: {
          node: {
            radius: nodeRadius
          }
        },
        x,
        y
      });
    });
  }
}
