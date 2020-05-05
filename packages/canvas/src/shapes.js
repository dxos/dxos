//
// Copyright 2020 DxOS, Inc.
//

import faker from "faker";

import { createController, updateController } from './controller';

import { createPath } from './util';

/**
 * Creates a display Object.
 * @param type
 * @param properties
 * @return {{bounds: *, id: string, type: *}}
 */
export const createObject = (type, properties) => {
  const id = faker.random.uuid();

  return {
    ...properties,

    id,
    type,
  };
};

/**
 * Creates the object.
 * @param group
 */
export const appendObject = (group) => {
  const { type } = group.datum();

  switch (type) {
    case 'path': {
      group.append('path');
      break;
    }

    case 'rect': {
      group.append('rect');
      break;
    }

    case 'ellipse': {
      group.append('ellipse');
      break;
    }

    default: {
      console.warn(`Unknown type: ${type}`);
    }
  }
};

/**
 * Updates the object.
 * @param group
 * @param grid
 * @param drag
 * @param classes
 * @param selected
 */
export const updateObject = (group, grid, drag, classes, selected) => {
  const { type, bounds } = group.datum();
  const { x, y } = grid.project(bounds);
  const width = grid.scaleX(bounds.width);
  const height = grid.scaleY(bounds.height);

  group
    .attr('transform', () => `translate(${x || 0}, ${y || 0})`);

  // TODO(burdon): Refine selection to first child.

  switch (type) {
    case 'path': {
      const { points } = group.datum();
      group.select('path')
        .attr('d', () => createPath(points.map(grid.project)));
      break;
    }

    case 'rect': {
      group.select('rect')
        .attr('x', 0)
        .attr('y', height)
        .attr('width', width)
        .attr('height', Math.abs(height));
      break;
    }

    case 'ellipse': {
      group.select('ellipse')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('rx', width / 2)
        .attr('ry', Math.abs(height) / 2);
      break;
    }

    default: {
      console.warn(`Unknown type: ${type}`);
    }
  }

  // Add/remove control group.
  const control = group.select(`g.${classes.control}`);
  if (selected) {
    group.raise();
    if (control.empty()) {
      group.append('g')
        .attr('class', classes.control)
        .call(createController, classes)
        .call(updateController, grid, drag, { width, height }, classes);
    } else {
      control
        .call(updateController, grid, drag, { width, height }, classes);
    }
  } else if (!control.empty()) {
    control.remove();
  }
};
