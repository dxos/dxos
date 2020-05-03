//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';

/**
 * Creates the control elements.
 * @param group
 * @param classes
 */
export const createController = (group, classes) => {

  // https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  const handles = [
    { id: 'TL', type: 'handle-bounds', handleX: -1, handleY:  1, cursor: 'nwse-resize' },
    { id: 'L',  type: 'handle-bounds', handleX: -1, handleY:  0, cursor: 'ew-resize' },
    { id: 'BL', type: 'handle-bounds', handleX: -1, handleY: -1, cursor: 'nesw-resize' },

    { id: 'T',  type: 'handle-bounds', handleX:  0, handleY:  1, cursor: 'ns-resize' },
    { id: 'B',  type: 'handle-bounds', handleX:  0, handleY: -1, cursor: 'ns-resize' },

    { id: 'TR', type: 'handle-bounds', handleX:  1, handleY:  1, cursor: 'nesw-resize' },
    { id: 'R',  type: 'handle-bounds', handleX:  1, handleY:  0, cursor: 'ew-resize' },
    { id: 'BR', type: 'handle-bounds', handleX:  1, handleY: -1, cursor: 'nwse-resize' }
  ];

  // Handles.
  const { type } = group.datum();
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
        .selectAll('rect')
        .data(handles, d => d.id)
        .join('rect')
          .attr('class', classes.handle)
          .style('cursor', ({ cursor }) => cursor);
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
  const handleSize = 6;

  const { type } = group.datum();
  switch (type) {
    case 'path': {
      // Control handle for each point.
      const { points } = group.datum();
      group.select('g')
        .selectAll(`circle.${classes.handle}`)
          .data(points.map(point => ({ type: 'handle-point', ...point })))
          .join(group => group.append('circle')
            .attr('class', classes.handle)
            .attr('r', handleSize))
          .call(drag)
          .attr('cx', d => grid.scaleX(d.x))
          .attr('cy', d => grid.scaleY(d.y));

      break;
    }

    default: {
      // Bounding box.
      group.select('rect')
        .attr('x', 0)
        .attr('y', height)
        .attr('width', width)
        .attr('height', Math.abs(height));

      // Handles.
      group.selectAll(`g rect.${classes.handle}`)
        .each(({ handleX, handleY }, i, nodes) => {
          d3.select(nodes[i])
            .call(drag)
            .attr('x', (handleX + 1) * (width / 2) - handleSize)
            .attr('y', (handleY + 1) * (height / 2) - handleSize)
            .attr('width', handleSize * 2)
            .attr('height', handleSize * 2);
        });
    }
  }
};
