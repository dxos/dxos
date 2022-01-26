//
// Copyright 2020 DXOS.org
//

import { Layout } from './layout';

/**
 * Layout nodes on the grid.
 */
export class GridLayout extends Layout {
  _onUpdate (grid, data) {
    const { nodes = [], links = [] } = data;
    const { scaleX, scaleY } = grid;

    const w = Math.floor(Math.sqrt(nodes.length));
    const unit = 10;

    this._setData({
      nodes: nodes.map((node, i) => Object.assign({}, node, {
        x: scaleX(i % w * unit),
        y: scaleY(Math.floor(i / w) * unit)
      })),

      links
    });
  }
}
