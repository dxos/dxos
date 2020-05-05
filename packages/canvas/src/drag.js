//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import debug from 'debug';

import { createPath } from './util';
import { createObject } from './shapes';

const log = debug('spore:canvas:drag');

/**
 * Creates a drag handler that manages selecting and creating shapes.
 *
 * @param container
 * @param grid
 * @param tool
 * @param snap
 * @param onUpdate
 * @returns {d3.drag}
 */
export const createToolDrag = (container, grid, tool, snap, onUpdate) => {
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
                .attr('d', createPath([initialPos, currentPos]));

          break;
        }

        default: {
          const bounds = grid.bounds(initialPos, currentPos);
          d3.select(container)
            .select('g')
              .selectAll('rect')
                .attr('x', bounds.x)
                .attr('y', bounds.y)
                .attr('width', bounds.width)
                .attr('height', bounds.height);

          break;
        }
      }

      onUpdate(null);
    })
    .on('end', () => {
      // console.log('end');
      // TODO(burdon): Abort if zero size.

      const snapper = pos => snap ? grid.snap(pos) : pos;
      const startPos = snapper(initialPos);
      const endPos = snapper({
        x: d3.event.x,
        y: d3.event.y,
      });

      const size = {
        dx: endPos.x - startPos.x,
        dy: endPos.y - startPos.y
      };

      let object;
      switch (tool) {
        case 'path': {
          object = createObject('path', {
            bounds: {
              ...grid.invert(startPos),
            },
            points: [
              { x: 0, y: 0 },
              {
                x: grid.scaleX.invert(size.dx),
                y: grid.scaleY.invert(size.dy)
              }
            ]
          });

          break;
        }

        case 'rect':
        case 'ellipse': {
          object = createObject(tool, {
            bounds: {
              ...grid.invert({
                x: startPos.x + (size.dx < 0 ? size.dx : 0),
                y: startPos.y + (size.dy < 0 ? 0 : size.dy)
              }),
              width: Math.abs(grid.scaleX.invert(size.dx)),
              height: Math.abs(grid.scaleY.invert(size.dy))
            }
          });

          break;
        }

        default: {
          console.log('Invalid tool:', tool);
        }
      }

      if (object) {
        onUpdate(object);
      }

      d3.select(container)
        .select('g')
        .remove();

      initialPos = undefined;
    });
};

/**
 * Creates a drag handler that manages moving and resizing objects.
 *
 * @param {Node} container
 * @param {Grid} grid
 * @param {boolean} snap
 * @param {function} onSelect
 * @param {function} onUpdate
 * @returns {d3.drag}
 */
export const createObjectDrag = (container, grid, snap, onSelect, onUpdate) => {
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



      // TODO(burdon): Snap or not?
      // TODO(burdon): Use grid methods (see dragger above).
      // const snapper = pos => snap ? grid.snap(pos) : pos;
      // TODO(burdon): Bug. Get position in screen space then snap and invert.
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
        return grid.round({ x: x + dx, y: y + dy });
      };




      const { type } = d;
      switch (type) {
        //
        // Move point.
        //
        case 'handle-point': {
          const { points } = initialObject;
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
            const { x, y } = grid.round({
              x: bounds.x + (handleX < 0 ? dx : 0),
              y: bounds.y + (handleY < 0 ? dy : 0)
            });

            const { x: width, y: height } = grid.round({
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

        // TODO(burdon): Select point on line (enable delete).
        if (points[i].x === d.x && points[i].y === d.y) {
          log('select', JSON.stringify(d));
        }
      }

      initialPos = undefined;
      initialObject = undefined;
    });
};
