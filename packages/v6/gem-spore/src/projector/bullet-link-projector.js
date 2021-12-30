//
// Copyright 2019 DXOS.org
//

import * as d3 from 'd3';
import assert from 'assert';

import { Projector } from './projector';

/**
 * Animated bullets between nodes.
 */
export class BulletLinkProjector extends Projector {

  constructor (linkProjector, options) {
    super(options);

    assert(linkProjector);
    this._linkProjector = linkProjector;
  }

  update (grid, data, { group }) {
    this._group = group;
    this._linkProjector.update(grid, data, { group });
  }

  fire (group, node) {
    const { max = 32, radius = 3 } = this._options || {};

    d3.select(this._group)
      .selectAll('path')
      .each((d, i, links) => {
        const { source, target } = d;
        if (source.id === node) {
          const self = this;
          const path = d3.select(links[i]);
          let p = path.node().getPointAtLength(0);

          const bullet = d3.select(group)
            .append('circle')
              .attr('class', 'bullet')
              .attr('cx', p.x)
              .attr('cy', p.y)
              .attr('r', radius);

          bullet
            .transition()
            .delay(50) // TODO(burdon): Config.
            .duration(200 + Math.random() * 1000)
            .ease(d3.easeLinear)
            .tween('pathTween', function() {
              let node = this;
              let length = path.node().getTotalLength();
              let r = d3.interpolate(0, length);

              return (t) => {
                let point = path.node().getPointAtLength(r(t));
                d3.select(node)
                  .attr('cx', point.x)
                  .attr('cy', point.y);
              };
            })
            .on('end', function() {
              d3.select(this).remove();

              // Propagate with circuit breaker to prevent infinite recursion.
              let num = d3.select(group).selectAll('circle').size();
              if (num < max) {
                self.fire(group, target.id);
              }
            });
        }
      });
  }
}
