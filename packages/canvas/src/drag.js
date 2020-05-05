//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import debug from 'debug';

import { createPath } from './util';

const log = debug('spore:canvas:drag');

/**
 * Creates a drag handler that manages selecting and creating shapes.
 *
 * @param container
 * @param grid
 * @param tool
 * @param onSelect
 * @returns {d3.drag}
 */
// TODO(burdon): Configure by tools (select, line, rect).
export const createToolDrag = (container, grid, tool, onSelect) => {
  let initialPos = undefined;

  return d3.drag()
    .container(container)
    .on('start', () => {
      // console.log('start', tool);

      initialPos = {
        x: d3.event.x,
        y: d3.event.y,
      };

      switch (tool) {
        case 'path': {
          d3.select(container)
            .append('g')
              .append('path');

          break;
        }

        default: {
          d3.select(container)
            .append('g')
            .call(group => {
              // Inner and outer selection frame.
              group.append('rect')
                .attr('class', 'selector');
              group.append('rect')
                .attr('class', 'selector-inner');
            });

          break;
        }
      }

      onSelect(null);
    })
    .on('drag', () => {
      // console.log('drag');

      const currentPos = {
        x: d3.event.x,
        y: d3.event.y,
      };

      switch (tool) {
        case 'path': {
          d3.select(container)
            .select('g')
              .select('path')
                .attr('d', createPath([
                  { x: initialPos.x, y: initialPos.y },
                  { x: currentPos.x, y: currentPos.y }
                ]));

          break;
        }

        // TODO(burdon): Snap if not select.
        default: {
          const size = {
            dx: currentPos.x - initialPos.x,
            dy: currentPos.y - initialPos.y
          };

          d3.select(container)
            .select('g')
              .selectAll('rect')
                .attr('x', initialPos.x + (size.dx < 0 ? size.dx : 0))
                .attr('y', initialPos.y + (size.dy < 0 ? size.dy : 0))
                .attr('width', Math.abs(size.dx))
                .attr('height', Math.abs(size.dy));

          break;
        }
      }
    })
    .on('end', () => {
      // console.log('end');

      // TODO(burdon): Select bounds or create object.
      d3.select(container)
        .select('g')
        .remove();
    });
};

/**
 * Creates a drag handler that manages moving and resizing objects.
 *
 * @param {Node} container
 * @param {Grid} grid
 * @param {function} onSelect
 * @param {function} onUpdate
 * @returns {d3.drag}
 */
export const createObjectDrag = (container, grid, onSelect, onUpdate) => {
  let initialPos = undefined;
  let initialObject = undefined;

  // https://github.com/d3/d3-drag#drag
  // https://observablehq.com/@d3/click-vs-drag
  return d3.drag()
    .container(container)

    // Default (return null to prevent drag -- e.g., if locked).
    .subject(function () {
      return d3.select(this).datum();
    })

    // d3.event.subject === d
    .on('start', (d, i, nodes) => {
      // Get parent (in case handle).
      const parent = nodes[i].closest('g[type="object"]');
      const { id } = d3.select(parent).datum();

      // Starting position.
      initialPos = {
        x: d3.event.x,
        y: d3.event.y,
      };

      // Keep a clone of the object.
      initialObject = { ...d3.select(parent).datum() };
      log('start', JSON.stringify(initialObject, null, 2));

      onSelect([id]);
    })

    .on('drag', (d, i, nodes) => {
      // Datum from parent object.
      const parent = nodes[i].closest('g[type="object"]');
      const { id } = d3.select(parent).datum();

      // Get delta in user space.
      const delta = (ref = initialPos) => {
        const { x, y } = grid.snap({
          x: d3.event.x - ref.x,
          y: d3.event.y - ref.y
        });

        return {
          dx: Math.round(grid.scaleX.invert(x)),
          dy: Math.round(grid.scaleY.invert(y))
        };
      };

      // Clamp values in user space.
      const clamp = ({ x, y }, { dx, dy }) => {
        return grid.snapUser({ x: x + dx, y: y + dy });
      };

      const { type } = d;
      switch (type) {
        //
        // Move point.
        //
        case 'handle-point': {
          const { points } = initialObject;

          // TODO(burdon): Should be relative to the initial mouse pos?
          const { x, y } = clamp(points[i], delta());

          const updated = [...points];
          updated.splice(i, 1, { x, y });
          onUpdate(id, { points: updated });
          break;
        }

        //
        // Resize bounds.
        //
        case 'handle-bounds': {
          // Datum from drag handler.
          const { handleX = 0, handleY = 0 } = d;
          const { dx, dy } = delta();
          const { bounds } = initialObject;

          // Prevent resize to zero.
          {
            const width = bounds.width + (dx * handleX);
            const height = bounds.height + (dy * handleY);
            if (width <= 0 || height <= 0) {
              return;
            }
          }

          // Clamp.
          {
            const { x, y } = grid.snapUser({
              x: bounds.x + (handleX < 0 ? dx : 0),
              y: bounds.y + (handleY < 0 ? dy : 0)
            });

            const { x: width, y: height } = grid.snapUser({
              x: bounds.width + (dx * handleX),
              y: bounds.height + (dy * handleY)
            });

            onUpdate(id, { bounds: { x, y, width, height } });
          }
          break;
        }

        //
        // Move Objects.
        //
        default: {
          const { id, bounds } = d;
          const { x, y } = clamp(bounds, delta());

          onUpdate(id, { bounds: { x, y, width: bounds.width, height: bounds.height } });
          break;
        }
      }
    })

    .on('end', (d, i, nodes) => {
      const data = d3.select(nodes[i].closest('g[type="object"]')).datum();
      log('end', JSON.stringify(data, null, 2));

      const { type } = d;
      if (type === 'handle-point') {
        const parent = nodes[i].closest('g[type="object"]');
        const { points } = d3.select(parent).datum();
        if (points[i].x === d.x && points[i].y === d.y) {
          // TODO(burdon): Selection (enable delete).
          log('select', JSON.stringify(d));
        }
      }

      initialPos = undefined;
      initialObject = undefined;
    });
};
