//
// Copyright 2017 DxOS
//

import * as d3 from 'd3';

/**
 * Dragging.
 * https://bl.ocks.org/mbostock/ad70335eeef6d167bc36fd3c04378048
 *
 * @param container
 * @param dragGroup
 * @param simulation
 * @param options
 * @return {*}
 */
// TODO(burdon): Factor out simulation.
export const createDrag = (container, dragGroup, simulation, options = {}) => {

  // TODO(burdon): Events instead of prop handlers.
  let { onLink, onCreate } = options;

  // TODO(burdon): !!!
  const rad = 30;

  // Find parent group.
  const getGroupElement = element => {
    while (!d3.select(element).classed('node')) {
      element = element.parentElement;
      if (!element) {
        break;
      }
    }

    return element;
  };

  // Group being dragged.
  let dragging = null;

  // Creating link.
  let linking = null;
  let linkCenter = null;

  // https://github.com/d3/d3-drag#drag
  return (
    d3.drag()
      .container(container)

      // Changes subject to the closest node.
      // https://github.com/d3/d3-drag#drag_subject
      // https://github.com/d3/d3-force#simulation_find
      .subject(() => simulation.find(d3.event.x, d3.event.y, rad))

      .on('start', function() {
        d3.event.active || simulation.alphaTarget(0.1).restart();

        // Linking.
        if (onLink && d3.event.sourceEvent.metaKey) {
          linking = dragGroup.append('svg:path');
          linkCenter = d3.mouse(container);
        }

        dragging = d3.select(getGroupElement(d3.event.sourceEvent.target));

        d3.event.subject.fx = d3.event.subject.x;
        d3.event.subject.fy = d3.event.subject.y;
      })

      .on('drag', function() {
        if (dragging) {
          d3.event.active || simulation.alphaTarget(0.3).restart();

          if (linking) {
            // NOTE: d3.mouse is relative to the parent container.
            linking.attr('d', d3.line()([linkCenter, d3.mouse(container)]));
          } else {
            d3.event.subject.fx = d3.event.x;
            d3.event.subject.fy = d3.event.y;
          }

          dragging.classed('dragging', true);
        }
      })

      .on('end', function() {
        if (dragging) {
          d3.event.active || simulation.alphaTarget(0).restart();

          dragging.classed('dragging', false);

          if (linking) {
            linking.remove();

            let target = simulation.find(d3.event.x, d3.event.y, rad);
            if (target) {
              if (onLink && d3.event.subject.id !== target.id) {
                onLink(d3.event.subject.id, target.id);
              }
            } else if (onCreate) {
              onCreate(d3.event.subject.id, { x: d3.event.x, y: d3.event.y });
            }

            d3.event.subject.fx = null;
            d3.event.subject.fy = null;
          } else {

            // Fix position after drag if holding SHIFT key.
            if (d3.event.sourceEvent.shiftKey) {
              dragging.classed('fixed', true);
            } else {
              d3.event.subject.fx = null;
              d3.event.subject.fy = null;

              dragging.classed('fixed', false);
            }
          }

          dragging = null;
          linking = null;
        }
      })
  );
};
