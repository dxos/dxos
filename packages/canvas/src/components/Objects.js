//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';

import { noop } from '@dxos/gem-core';

import { dragGenerator } from '../drag';
import { appendObject, updateObject } from '../shapes';

// TODO(burdon): Factor out styles.
const useStyles = makeStyles({
  objects: {},

  object: {
    '& > rect': {
      strokeWidth: 2,
      stroke: grey[500],
      fill: grey[100],
    },

    '& > ellipse': {
      strokeWidth: 2,
      stroke: grey[500],
      fill: grey[100],
    },

    '& > path': {
      strokeWidth: 2,
      stroke: grey[500],
      fill: 'none',
    }
  },

  control: {},

  box: {
    strokeWidth: 2,
    stroke: blue[500],
    fill: 'none',
    cursor: 'move'
  },

  handle: {
    strokeWidth: 1,
    stroke: blue[500],
    fill: blue[100],
    cursor: 'move'
  }
});

/**
 * Draws a collection of objects.
 *
 * Each object has a `bounds` object with `{ x, y }` of the bottom left of the bounding box relative to the origin.
 *
 * @param {Grid} grid
 * @param {{ id, bounds }[]} objects
 * @param {string|undefined} selected
 * @param {function} [onSelect]
 * @param {function} [onUpdate]
 */
// TODO(burdon): Convert selected to array.
const Objects = ({ grid, objects, selected, onSelect = noop, onUpdate = noop }) => {
  const classes = useStyles();
  const layer = useRef();
  const drag = useRef();

  useEffect(() => {
    drag.current = dragGenerator(layer.current, grid, onSelect, onUpdate);
  }, [grid]);

  useEffect(() => {

    // Create.
    const selection = d3.select(layer.current)
      .selectAll(`g.${classes.object}`)
        .data(objects, d => d.id)
        .join(enter => enter.append('g')
          .attr('id', d => d.id)
          .attr('type', 'object')                       // Anchor for parent group.
          .attr('class', classes.object)
          .each((d, i, nodes) => d3.select(nodes[i])
            .call(appendObject)))
        .call(drag.current);

    // Update.
    selection
      .each((d, i, nodes) => d3.select(nodes[i])
        .call(updateObject, grid, drag.current, classes, selected && selected.ids.find(id => id === d.id)));

  }, [grid, objects, selected, drag]);

  return (
    <g ref={layer} className={classes.objects} />
  );
};

export default Objects;
