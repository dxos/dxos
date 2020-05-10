//
// Copyright 2020 DxOS.org
//

import * as d3 from 'd3';

import { Layout } from './layout';

/**
 * Tree.
 */
export class TreeLayout extends Layout {

  _onUpdate(grid, data) {
    const { center, size } = grid;
    const r = size.height * .4;

    // https://github.com/d3/d3-hierarchy#tree
    const tree = d3.tree()
      .size([360, r])
      .separation((a, b) => (a.parent === b.parent ? 1 : 3) / a.depth);

    const hierarchy = tree(d3.hierarchy(data, d => d.children));

    // TODO(burdon): Separate layout from data.
    data.descendants = hierarchy.descendants.bind(hierarchy);

    const { height } = hierarchy;
    data.guides = [...new Array(height)].map((ignore, i) => ({
      id: `radius-${height}-${r}`,
      type: 'circle',
      cx: center.x,
      cy: center.y,
      r: (i + 1) * (r / height)
    }));
  }
}
