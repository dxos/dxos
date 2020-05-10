//
// Copyright 2020 DxOS.org
//

import { Layout } from './layout';

/**
 * Layout nodes on the grid.
 */
export class GridLayout extends Layout {

  _onUpdate(grid, data) {
    const { nodes = [] } = data;
    const { scaleX, scaleY } = grid;

    const w = Math.floor(Math.sqrt(nodes.length));
    const unit = 10;

    nodes.forEach((node, i) => {
      node.x = scaleX(i % w * unit);
      node.y = scaleY(Math.floor(i / w) * unit);
    });
  }
}
