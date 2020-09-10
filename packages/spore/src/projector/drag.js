//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import EventEmitter from 'events';

/**
 * Drag handler for simulation.
 *
 * https://bl.ocks.org/mbostock/2b534b091d80a8de39219dd076b316cd
 * https://bl.ocks.org/mbostock/ad70335eeef6d167bc36fd3c04378048 (simulation)
 * https://observablehq.com/@d3/circle-dragging-i
 *
 * @param {Object} simulation
 * @param {Object} options
 * @return {{ create: function, on: function, off: function }}
 */
export const createSimulationDrag = (simulation, options = {}) => {
  const emitter = new EventEmitter();
  const { link, freeze } = options;

  const create = container => {
    const state = {
      // Determines if dragging (if not then click on end).
      dragging: false,

      // Determines if linking.
      linking: false,

      // Determines if temporarily freezing positions while dragging.
      frozen: {}
    };

    // TODO(burdon): Configure.
    const parent = () => d3.event.sourceEvent.target
      .closest(`g[id="${d3.event.subject.id}"]`);

    // https://github.com/d3/d3-drag#drag
    // https://observablehq.com/@d3/click-vs-drag
    return d3.drag()

      // Determine coordinates for events.
      // https://github.com/d3/d3-drag#drag_container
      .container(container)

      // Get the datum of the element being dragged.
      // https://github.com/d3/d3-drag#drag_subject
      .subject(() => simulation.find(d3.event.x, d3.event.y))

    // Event handlers.
    // https://github.com/d3/d3-drag#drag_on
    // https://github.com/d3/d3-drag#drag-events

      .on('start', function () {
        const group = parent();
        const { [link]: linkModifier } = d3.event.sourceEvent;

        if (!d3.event.active) {
          simulation.alphaTarget(0.3).restart();
        }

        // Find group and raise.
        d3.select(group).raise();

        state.dragging = false;
        state.linking = linkModifier && link;

        // Check if already frozen.
        state.frozen = {
          x: d3.event.subject.fx !== null,
          y: d3.event.subject.fy !== null
        };

        emitter.emit('start', { source: d3.event.subject });
      })

      .on('drag', function () {
        // NOTE: Mouse position is different from the event position.
        const [x, y] = d3.mouse(this);
        const position = { x, y };

        // Freeze simulation for node if dragging.
        if (!state.linking) {
          if (!state.frozen.x) {
            d3.event.subject.fx = d3.event.x;
          }

          if (!state.frozen.y) {
            d3.event.subject.fy = d3.event.y;
          }
        }

        emitter.emit('drag', { source: d3.event.subject, position, linking: state.linking });

        state.dragging = true;
      })

      .on('end', function () {
        const { [freeze]: freezeModifier } = d3.event.sourceEvent;

        // TODO(burdon): Restart simulation?
        if (!d3.event.active) {
          simulation.alphaTarget(0);
        }

        //
        // Frozen nodes.
        //

        if (!state.frozen.x) {
          d3.event.subject.fx = null;
        }

        if (!state.frozen.y) {
          d3.event.subject.fy = null;
        }

        state.frozen = {};

        // Fix position.
        // TODO(burdon): Add class decoration.
        if (freezeModifier) {
          d3.event.subject.fx = d3.event.subject.x;
          d3.event.subject.fy = d3.event.subject.y;
        }

        // Link or click.
        if (state.dragging) {
          // TODO(burdon): Get radius from nodes (or target from currently highlighted).
          const target = simulation.find(d3.event.x, d3.event.y, 16);
          emitter.emit('end', { source: d3.event.subject, target, linking: state.linking });
        } else {
          emitter.emit('click', { source: d3.event.subject });
        }
      });
  };

  return {
    create,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter)
  };
};
