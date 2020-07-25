//
// Copyright 2019 DxOS.org
//

import * as d3 from 'd3';
import React from 'react';

import { withStyles } from '@material-ui/core';
import grey from '@material-ui/core/colors/grey';

import { Container, bounds, resize } from '@dxos/gem-core';

import { Isometric, drawCube } from '../src';

const styles = {
  root: {
    position: 'fixed',
    display: 'flex',
    flexGrow: 1,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: grey[0]
  },
};

const canvasStyles = {
  cube: {
    'grey': {
      fillStyle: grey[50],
      strokeStyle: grey[300]
    },
    's1': {
      fillStyle: grey[100],
      strokeStyle: grey[400]
    },
    's2': {
      fillStyle: grey[200],
      strokeStyle: grey[400]
    },
    's3': {
      fillStyle: grey[300],
      strokeStyle: grey[400]
    }
  }
};

const timerCallback = (cb) => {
  let last = 0;
  return (elapsed) => {
    cb(elapsed - last, elapsed);
    last = elapsed;
  };
};

// TODO(burdon): Gravity, stacking.

class Dataset {

  _data = [];

  get data() {
    return this._data.sort(({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 }) => {
      // Distance from origin (then by height).
      const d = (x, y) => Math.sqrt(x * x + y * y);

      const d1 = d(x1, y1);
      const d2 = d(x2, y2);

      return d1 < d2 ? 1 : d1 > d2 ? -1 : (z1 < z2) ? -1 : (z1 > z2) ? 1 : 0;
    });
  }

  add(item) {
    this._data.push(Object.assign({ id: `i-${this._data.length}` }, item));
    return this;
  }
}

class IsometricStory extends React.Component {

  _grid = new Dataset();

  _generator = new Dataset();

  constructor() {
    super(...arguments);

    const s = 18;
    for (let x = 0; x < s; x++) {
      for (let y = 0; y < s; y++) {
        const h = Math.random() + .1;
        this._grid.add({
          a: Math.PI / 4, x, y, z: 0, h: h, style: 'grey'
        });
      }
    }

    this._generator
      .add({ a: Math.PI / 4, x: 0, y: s, z: 1,   h: 3.5, style: 's1' })
      .add({ a: Math.PI / 4, x: 0, y: s, z: 4.5, h:  .5, style: 's2' })
      .add({ a: Math.PI / 4, x: 0, y: s, z: 0,   h: 1,   style: 's3' });

    let da = 0;
    this._onUpdate = (period) => {
      const d = Math.PI / s * 2;

      da += .01;
      this._grid.data.forEach((item) => {
        const { x, y } = item;
        item.h = 1 + Math.cos(da + d * (x - y)) * .9;
        item.style = x > 11 ? 's1' : x > 5 ? 's2' : 's3';
      });

      this._generator.data.find(({ id }) => id === 'i-1').a += period * .001;
    };
  }

  repaint() {
    const context = this._canvas.getContext('2d');
    const { width, height } = bounds(this._canvas);

    // TODO(burdon): Rotate world?
    const iso = new Isometric(context).scale3d(30, 30, 30);

    context.save();
    context.clearRect(0, 0, width, height);
    context.translate(width / 2, height * 0.9);

    const draw = (item) => {
      const { a, x, y, z, h, style = 'blue' } = item;
      const attr = canvasStyles.cube[style] || {};

      context.save();
      Object.assign(context, attr);
      drawCube(iso, a, x, y, z, h);
      context.restore();
    };

    this._generator.data.forEach(draw);
    this._grid.data.forEach(draw);

    context.restore();
  }

  componentDidMount() {
    if (!this._timer) {
      this._timer = d3.interval(timerCallback(period => {
        this._onUpdate(period);
        this.repaint();
      }));
    }
  }

  componentWillUnmount() {
    this._timer.stop();
  }

  render() {
    let { classes } = this.props;

    const handler = (bounds) => {
      if (resize(this._canvas, bounds)) {
        this.repaint();
      }
    };

    // TODO(burdon): Container deprecated.
    return (
      <div className={classes.root}>
        <Container onRender={handler} delay={0}>
          <canvas ref={el => this._canvas = el} />
        </Container>
      </div>
    );
  }
}

const IsometricStoryWithStyles = withStyles(styles)(IsometricStory);

export default {
  title: 'Isometric'
};

export const withField = () => {
  return (
    <IsometricStoryWithStyles />
  );
};
