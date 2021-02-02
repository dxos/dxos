//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';

import { Datum, GridType, noop } from '@dxos/gem-core';

import { createObjectDrag } from '../drag';
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

export interface ObjectProperties {
  grid: GridType;
  snap: boolean;
  objects: any[];
  model: any;
  selected: any;
  onSelect: (ids: string[]) => void;
}

/**
 * Draws a collection of objects.
 *
 * Each object has a `bounds` object with `{ x, y }` of the bottom left of the bounding box relative to the origin.
 */
const Objects = ({ grid, snap, objects, model, selected, onSelect = noop }: ObjectProperties) => {
  const classes = useStyles();
  const layer = useRef(null);

  // NOTE: Update order calling raise on update.
  objects.sort(({ properties: { order: a } }, { properties: { order: b } }) => a < b ? -1 : a > b ? 1 : 0).reverse();

  const drag = useRef(null);
  useEffect(() => {
    drag.current = createObjectDrag(layer.current, grid, snap, model, onSelect);
  }, [grid, snap, model]);

  const isSelected = objectId => selected && selected.ids.find(id => id === objectId);

  useEffect(() => {
    // Create.
    const objectGroups = d3.select(layer.current)
      .selectAll(`g.${classes.object}`)
        .data(objects, d => (d as Datum).id)
        .join(enter => enter.append('g')
          .attr('id', d => (d as Datum).id)
          .attr('type', 'object')                           // Anchor for parent group.
          .attr('class', classes.object)
          .each((d, i, nodes) => d3.select(nodes[i])
            .call(appendObject))
        );

    // Update.
    objectGroups
      .call(drag.current)
      .each((d, i, nodes) => d3.select(nodes[i])
        .call(updateObject, grid, drag.current, classes, isSelected((d as Datum).id))
        .call(g => g.raise()));

    // Raise selected.
    objectGroups
      .each((d, i, nodes) => isSelected((d as Datum).id) && d3.select(nodes[i]).raise());

  }, [drag, snap, grid, objects, selected]);

  return (
    <g ref={layer} className={classes.objects} />
  );
};

export default Objects;
