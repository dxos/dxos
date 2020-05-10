//
// Copyright 2018 DxOS
//

import times from 'lodash.times';
import { Chance } from 'chance';
import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';

import { makeStyles } from '@material-ui/core/styles';
import green from '@material-ui/core/colors/green';
import blue from '@material-ui/core/colors/blue';
import red from '@material-ui/core/colors/red';

import { SVG } from '@dxos/gem-core';

// TODO(burdon): Convert to Mesh/Grid widget/projector (hex also).

const chance = new Chance(0);

const random = (n) => Math.floor(Math.random() * n);

const size = {
  width: 24,
  height: 24,
  border: 2
};

class Grid {
  constructor(bounds) {
    this._bounds = bounds;
  }

  get range() {
    const { width, height } = this._bounds;

    return {
      x: Math.floor(width / (size.width + size.border)) - 1,
      y: Math.floor(height / (size.height + size.border)) - 1
    };
  }

  getPoint({ x, y }) {
    return {
      x: x * (size.width + size.border),
      y: y * (size.height + size.border)
    };
  }

  getPosition({ x, y }) {
    return {
      x: Math.floor(x / (size.width + size.border)),
      y: Math.floor(y / (size.height + size.border))
    };
  }
}

const data = times(128, (i) => ({ id: i }));

const layoutRandom = (data, { width, height }) => {
  const grid = new Grid({ width, height });

  data.forEach(item => {
    const point = grid.getPoint({
      x: random(grid.range.x),
      y: random(grid.range.y)
    });

    item.class = 'random';
    item.x = point.x;
    item.y = point.y;
  });
};

const layoutBlock = (data, bounds) => {
  layoutRandom(data, bounds);

  const grid = new Grid(bounds);

  const n = random(8);

  const offset = {
    x: random(grid.range.x - n),
    y: random(grid.range.y - n)
  };

  let i = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (i >= data.length) {
        return;
      }

      const point = grid.getPoint({ x: x + offset.x, y: y + offset.y });

      data[i].class = 'block';
      data[i].x = point.x;
      data[i].y = point.y;

      i++;
    }
  }
};

const layoutMove = (data, bounds) => {
  const grid = new Grid(bounds);

  data.forEach(item => {
    const pos = grid.getPosition({ x: item.x, y: item.y });

    pos.x += random(8) - 4;
    pos.y += random(8) - 4;

    item.class = 'move';
    item.x = grid.getPoint(pos).x;
    item.y = grid.getPoint(pos).y;
  });
};

// TODO(burdon): Functional layout?

const layouts = [
  layoutRandom,
  layoutBlock,
  layoutMove,
];

const rect = (el) => el
  .attr('class', d => d.class)
  .attr('x', d => d.x)
  .attr('y', d => d.y)
  .attr('width', size.width)
  .attr('height', size.height);

const useStyles = makeStyles(() => ({
  root: {
    position: 'fixed',
    display: 'flex',
    flexGrow: 1,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#333',

    '& rect': {
      'strokeWidth': 0,
    },
    '& rect.random': {
      'fill': red[600],
    },
    '& rect.block': {
      'fill': green[600],
    },
    '& rect.move': {
      'fill': blue[600],
      'filter': 'url(#blur)'
    }
  },
}));

const LayoutStory = () => {
  const classes = useStyles();
  const group = useRef();
  const [resizeListener, { width, height }] = useResizeAware();

  const next = ({ width, height }) => {
    chance.pick(layouts)(data, { width, height });

    const t = () => d3.transition()
      .delay(1000)
      .duration(1000)
      .ease(d3.easePoly);

    d3.select('#boxes')
      .transition(t())
      .on('end', () => next({ width, height }))
      .selectAll('rect')
        .call(rect);
  };

  useEffect(() => {
    layoutRandom(data, { width, height });

    const boxes = d3.select('#boxes')
      .selectAll('rect')
      .data(data)
      .join('rect');

    boxes
      .call(rect);

    next({ width, height });
  }, [width, height]);

  return (
    <div className={classes.root}>
      {resizeListener}
      <SVG width={width} height={height} center={false}>
        <g ref={group}>
          <defs>
            <filter id="blur">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          <g id="boxes" />
        </g>
      </SVG>
    </div>
  );
};

export default LayoutStory;
