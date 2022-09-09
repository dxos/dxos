//
// Copyright 2019 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { FullScreen } from '@dxos/gem-core';

import { Isometric, drawCube } from '../src';

export default {
  title: 'experimental/isometric'
};

const grey = {
  50: '#EEE',
  100: '#DDD',
  200: '#CCC',
  300: '#BBB',
  400: '#AAA'
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

// TODO(burdon): Util.
const timerCallback = (callback) => {
  let last = 0;
  return (elapsed) => {
    callback(elapsed - last, elapsed);
    last = elapsed;
  };
};

// TODO(burdon): Gravity, stacking.
class Dataset {
  _data = [];

  get data () {
    return this._data.sort(({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 }) => {
      // Distance from origin (then by height).
      const d = (x, y) => Math.sqrt(x * x + y * y);

      const d1 = d(x1, y1);
      const d2 = d(x2, y2);

      return d1 < d2 ? 1 : d1 > d2 ? -1 : (z1 < z2) ? -1 : (z1 > z2) ? 1 : 0;
    });
  }

  add (item) {
    this._data.push(Object.assign({ id: `i-${this._data.length}` }, item));
    return this;
  }
}

/**
 * Returns bounds of element.
 */
const bounds = (el) => {
  if (!el) {
    return {
      width: 0,
      height: 0
    };
  }

  const selected = d3.select(el);

  return {
    width: Number(selected.attr('width')) || 0,
    height: Number(selected.attr('height')) || 0
  };
};

const paint = (canvas, grid, generator) => {
  const context = canvas.getContext('2d');
  const { width, height } = bounds(canvas);

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

  generator.data.forEach(draw);
  grid.data.forEach(draw);

  context.restore();
};

const Component = () => {
  const [resizeListener, { width, height }] = useResizeAware();
  const canvas = useRef(null);
  const [grid] = useState(new Dataset());
  const [generator] = useState(new Dataset());
  const daRef = useRef(0);

  useEffect(() => {
    const s = 18;
    for (let x = 0; x < s; x++) {
      for (let y = 0; y < s; y++) {
        const h = Math.random() + 0.1;
        grid.add({
          a: Math.PI / 4, x, y, z: 0, h, style: 'grey'
        });
      }
    }

    generator
      .add({ a: Math.PI / 4, x: 0, y: s, z: 1, h: 3.5, style: 's1' })
      .add({ a: Math.PI / 4, x: 0, y: s, z: 4.5, h: 0.5, style: 's2' })
      .add({ a: Math.PI / 4, x: 0, y: s, z: 0, h: 1, style: 's3' });

    const interval = setInterval(timerCallback(period => {
      const d = Math.PI / s * 2;

      const da = daRef.current + 0.01;
      daRef.current = da;

      grid.data.forEach((item) => {
        const { x, y } = item;
        item.h = 1 + Math.cos(da + d * (x - y)) * 0.9;
        item.style = x > 11 ? 's1' : x > 5 ? 's2' : 's3';
      });

      const data = generator.data.find(({ id }) => id === 'i-1');
      if (data) {
        data.a += period * 0.001;
      }

      paint(canvas.current, grid, generator);
    }));

    return () => clearInterval(interval);
  }, [canvas.current]);

  return (
    <div>
      {resizeListener}
      <canvas ref={canvas} width={width} height={height} />
    </div>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <Component />
    </FullScreen>
  );
};
