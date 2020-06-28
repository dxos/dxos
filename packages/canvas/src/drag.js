//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';

import { createPath } from '@dxos/gem-core';

const log = debug('gem:canvas:drag');

/**
 * Creates a drag handler that manages selecting and creating shapes.
 *
 * @param container
 * @param grid
 * @param tool
 * @param snap
 * @param onCreate
 * @returns {d3.drag}
 */
export const createToolDrag = (container, grid, tool, snap, onCreate) => {
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

      onCreate(null);
    })
    .on('end', () => {
      // console.log('end');

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

      let properties;
      switch (tool) {
        case 'select': {
          // TODO(burdon): Select from mouse position.
          log('select', JSON.stringify(grid.bounds(initialPos, endPos)));
          break;
        }

        case 'path': {
          properties = {
            type: 'path',
            bounds: { ...grid.invert(startPos), },
            points: [
              {
                x: 0,
                y: 0
              },
              {
                x: grid.scaleX.invert(size.dx),
                y: grid.scaleY.invert(size.dy)
              }
            ]
          };

          break;
        }

        case 'text':
        case 'rect':
        case 'ellipse': {
          const { x, y } = grid.invert({
            x: startPos.x + (size.dx < 0 ? size.dx : 0),
            y: startPos.y + (size.dy < 0 ? 0 : size.dy)
          });

          // TODO(burdon): Round (replace "invert" with fractions).
          const width = Math.round(Math.abs(grid.scaleX.invert(size.dx)));
          const height = Math.round(Math.abs(grid.scaleY.invert(size.dy)));

          // Minimal size.
          if (Math.round(width / grid.unit) && Math.round(height / grid.unit)) {
            properties = {
              type: tool,
              bounds: { x, y, width, height }
            };
          }

          break;
        }

        default: {
          console.log('Invalid tool:', tool);
        }
      }

      if (properties) {
        onCreate(properties);
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
 * @param {Object} model
 * @param {function} onSelect
 * @returns {d3.drag}
 */
export const createObjectDrag = (container, grid, snap, model, onSelect) => {
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

      // Select object.
      onSelect([id]);

      // Begin transaction.
      model.begin();
    })

    .on('drag', (d, i, nodes) => {
      // Datum from parent object.
      const parent = nodes[i].closest('g[type="object"]');
      const { id } = d3.select(parent).datum();

      const snapper = pos => snap ? grid.round(pos) : pos;
      const snapTo = ({ x, y }) => snapper({
        x: grid.scaleX.invert(grid.scaleX(x) + d3.event.x - initialPos.x),
        y: grid.scaleY.invert(grid.scaleY(y) + d3.event.y - initialPos.y)
      });

      const { type } = d;
      switch (type) {

        //
        // Move point.
        //
        case 'handle-point': {
          const { properties: { points } } = initialObject;
          const updated = [...points];
          updated.splice(i, 1, snapTo(points[i]));

          // TODO(burdon): Check changed.
          model.updateObject(id, { points: updated });
          break;
        }

        //
        // Resize bounds.
        //
        case 'handle-bounds': {
          const { properties: { bounds } } = initialObject;

          // Datum from drag handler.
          const { handleX = 0, handleY = 0 } = d;

          const dx = d3.event.x - initialPos.x;
          const dy = d3.event.y - initialPos.y;

          const { x, y } = snapper({
            x: bounds.x + grid.scaleX.invert(handleX < 0 ? dx : 0),
            y: bounds.y + grid.scaleY.invert(handleY < 0 ? dy : 0)
          });

          const { x: width, y: height } = snapper({
            x: bounds.width + grid.scaleX.invert(dx * handleX),
            y: bounds.height + grid.scaleY.invert(dy * handleY),
          });

          model.updateObject(id, { bounds: { x, y, width, height } });
          break;
        }

        //
        // Move Objects.
        //
        default: {
          const { id, properties: { bounds } } = d;
          const { x, y } = snapTo(bounds);

          // TODO(burdon): Check changed (bounds is stale).
          if (x !== bounds.x || y !== bounds.y ) {
            model.updateObject(id, { bounds: { x, y, width: bounds.width, height: bounds.height } });
          }
          break;
        }
      }
    })

    // TODO(burdon): "Commit" model.
    .on('end', (d, i, nodes) => {
      const data = d3.select(nodes[i].closest('g[type="object"]')).datum();
      log('end', JSON.stringify(data, null, 2));

      const { type } = d;
      if (type === 'handle-point') {
        const parent = nodes[i].closest('g[type="object"]');
        const { properties: { points } } = d3.select(parent).datum();

        // TODO(burdon): Create flag for drag (if not moved then click).
        // TODO(burdon): Select point on line (enable delete).
        if (points[i].x === d.x && points[i].y === d.y) {
          log('select', JSON.stringify(d));
        }
      }

      initialPos = undefined;
      initialObject = undefined;

      // End transaction.
      model.commit();
    });
};
