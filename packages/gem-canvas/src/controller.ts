//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

export interface Handle {
  id: string;
  type: string;
  index?: number;
  properties: {
    handleX?: number;
    handleY?: number;
    cursor?: string;
  }
}

/**
 * Creates the control elements.
 * @param group
 * @param classes
 */
export const createController = (group, classes) => {

  // TODO(burdon): Move to properties (like object).
  // https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  const handles = [
    { id: 'TL', type: 'handle-bounds', properties: { handleX: -1, handleY:  1, cursor: 'nwse-resize' } },
    { id: 'L',  type: 'handle-bounds', properties: { handleX: -1, handleY:  0, cursor: 'ew-resize' } },
    { id: 'BL', type: 'handle-bounds', properties: { handleX: -1, handleY: -1, cursor: 'nesw-resize' } },

    { id: 'T',  type: 'handle-bounds', properties: { handleX:  0, handleY:  1, cursor: 'ns-resize' } },
    { id: 'B',  type: 'handle-bounds', properties: { handleX:  0, handleY: -1, cursor: 'ns-resize' } },

    { id: 'TR', type: 'handle-bounds', properties: { handleX:  1, handleY:  1, cursor: 'nesw-resize' } },
    { id: 'R',  type: 'handle-bounds', properties: { handleX:  1, handleY:  0, cursor: 'ew-resize' } },
    { id: 'BR', type: 'handle-bounds', properties: { handleX:  1, handleY: -1, cursor: 'nwse-resize' } }
  ];

  // Handles.
  const { properties: { type, points } } = group.datum();
  switch (type) {
    case 'path': {
      // Handle group.
      group.append('g');
      break;
    }

    default: {
      // Bounding box.
      group.append('rect')
        .attr('class', classes.box);

      // Handle group (8 resize handles).
      group.append('g')
        .selectAll('circle')
        .data(handles, d => d.id)
        .join('circle')
          .attr('class', classes.handle)
          .style('cursor', ({ properties: { cursor } }) => cursor);
    }
  }
};

/**
 * Updates the control elements.
 * @param group
 * @param grid
 * @param drag
 * @param size
 * @param classes
 */
export const updateController = (group, grid, drag, { width, height }, classes) => {
  const handleSize = 5;

  const { properties: { type } } = group.datum();
  switch (type) {
    //
    // Control handle for each point.
    //
    case 'path': {
      const { properties: { points } } = group.datum();
      group.select('g')
        .selectAll(`circle.${classes.handle}`)
          .data(points.map((point, i) => ({ id: i, index: i, type: 'handle-point', ...point })))
          .join(group => group.append('circle')
            .attr('class', classes.handle)
            .attr('r', handleSize))
          .call(drag)
          .attr('cx', d => grid.scaleX(d.x))
          .attr('cy', d => grid.scaleY(d.y));

      break;
    }

    //
    // Bounding box for shapes.
    //
    case 'ellipse':
    case 'rect':
    default: {
      group.select('rect')
        .attr('x', 0)
        .attr('y', height)
        .attr('width', width)
        .attr('height', Math.abs(height));

      //
      // Handles.
      //
      group.selectAll(`g circle.${classes.handle}`)
        .each(({ properties: { handleX, handleY } }, i, nodes) => {
          d3.select(nodes[i])
            .call(drag)
            .attr('cx', (handleX + 1) * (width / 2))
            .attr('cy', (handleY + 1) * (height / 2))
            .attr('r', handleSize);
        });
    }
  }
};
