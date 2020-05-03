//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import debug from 'debug';

const log = debug('spore:canvas:drag');

/**
 * Creates a drag handler that manages moving and resizing objects.
 * @param {Node} container
 * @param {Grid} grid
 * @param {function} onSelect
 * @param {function} onUpdate
 */
export const dragGenerator = (container, grid, onSelect, onUpdate) => {
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
