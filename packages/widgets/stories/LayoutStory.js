//
// Copyright 2018 DxOS
//

import { Chance } from 'chance';
import * as d3 from 'd3';
import React from 'react';
import times from 'lodash.times';

import { withStyles } from '@material-ui/core/styles';
import green from '@material-ui/core/colors/green';
import blue from '@material-ui/core/colors/blue';
import red from '@material-ui/core/colors/red';

import { Container } from  '@dxos/gem-core';

// TODO(burdon): Factor out Mesh components.

const styles = {
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
};

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

class LayoutStory extends React.Component {

  handleResize = ({ width, height }) => {

    // TODO(burdon): Use translate to set origin.
    // context.translate(width / 2, height / 2);

    const t = () => d3.transition()
      .delay(1000)
      .duration(1000)
      .ease(d3.easePoly);

    d3.select(this._svg)
      .attr('width', width)
      .attr('height', height);

    const boxes = d3.select('#boxes')
      .selectAll('rect')
      .data(data)
      .join('rect');

    layoutRandom(data, { width, height });

    boxes
      .call(rect);

    const next = () => {
      chance.pick(layouts)(data, { width, height });

      d3.select('#boxes')
        .transition(t())
        .on('end', next)
        .selectAll('rect')
        .call(rect);
    };

    next();
  };

  render() {
    let { classes } = this.props;

    return (
      <div className={classes.root}>
        <Container onRender={this.handleResize} delay={0}>
          <svg ref={el => this._svg = el}>
            <defs>
              <filter id="blur">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            <g id="boxes" />
          </svg>
        </Container>
      </div>
    );
  }
}

export default withStyles(styles)(LayoutStory);
