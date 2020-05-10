//
// Copyright 2020 DxOS.org
//

import get from 'lodash.get';

import { value } from '@dxos/gem-core';

import { Layout } from './layout';

/**
 * Layout nodes around circle.
 */
export class RadialLayout extends Layout {

  _onUpdate(grid, data) {
    const { nodes = [] } = data;

    const center = value(this._options.center)(grid);
    const radius = value(this._options.radius)(grid);

    const nodeRadius =
      value(get(this._options, 'node.radius') || Math.min(Math.PI * radius * 2 / nodes.length / 3, 32))();

    const theta = Math.PI * 2 / nodes.length;

    nodes.forEach((node, i) => {
      Object.assign(node, {
        layout: {
          node: {
            radius: nodeRadius
          }
        },
        x: center.x + Math.sin(theta * i) * radius,
        y: center.y - Math.cos(theta * i) * radius
      });
    });
  }
}
