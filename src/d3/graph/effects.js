//
// Copyright 2019 DxOS
//

import * as d3 from 'd3';

/**
 * Generate animated pulses.
 */
export const pulse = (graph, node, options) => {
  const { max = 20, radius = 3 } = options || {};

  const linkIds = graph.data.links
    .filter(link => link.source.id === node)
    .map(({ id }) => id);

  // Iterate all connected links.
  graph
    .getLinkElements(linkIds)
    .each(function(link) {
      let path = d3.select(this);

      let p = path.node().getPointAtLength(0);

      // TODO(burdon): Create group for this.
      // https://github.com/d3/d3-transition#transition_tween
      d3.select(graph.svg).append('circle')
        .attr('class', 'dot')
        .attr('cx', p.x)
        .attr('cy', p.y)
        .attr('r', radius)
        .transition()
          .delay(50)
          .duration(200 + Math.random() * 1000)
          .ease(d3.easeLinear)
          .tween('pathTween', function() {
            let node = this;
            let length = path.node().getTotalLength();
            let r = d3.interpolate(0, length);

            return function(t) {
              let point = path.node().getPointAtLength(r(t));
              d3.select(node)
                .attr('cx', point.x)
                .attr('cy', point.y);
            };
          })
          .on('end', function() {
            d3.select(this).remove();

            // Propagate with circuit breaker to prevent infinite recursion.
            let num = d3.select(graph.svg).selectAll('circle.dot').size();
            if (num < max) {
              pulse(graph, link.target.id);
            }
          });
    });
};
