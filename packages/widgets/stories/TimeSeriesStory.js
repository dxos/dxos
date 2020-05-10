//
// Copyright 2018 DxOS
//

import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import useResizeAware from 'react-resize-aware';

import { SVG } from '@dxos/gem-core';

import { TimeSeries } from '../src';

/**
 * Test time-series data generator.
 */
class Generator {

  constructor(min = 1000, delta = 0) {
    this._min = min;
    this._delta = delta;
    this._running = false;
    this._onUpdate = null;
    this._data = [];
  }

  get data() {
    return this._data;
  }

  tick() {
    this._timeout = setTimeout(() => {

      // TODO(burdon): Clip old data.
      this._data.push({
        ts: Date.now()
      });

      this._onUpdate && this._onUpdate(this._data);

      if (this._running) {
        this.tick();
      }
    }, this._min + Math.random() * this._delta);
  }

  onUpdate(callback) {
    this._onUpdate = callback;
    return this;
  }

  start() {
    if (!this._running) {
      this._running = true;
      this.tick();
    }

    return this;
  }

  stop() {
    clearTimeout(this._timeout);
    this._running = false;
    return this;
  }
}

const useStyles = makeStyles(() => ({
  root: ({ height }) => ({
    position: 'fixed',
    display: 'flex',
    left: 0,
    right: 0,
    top: 0,
    height,

    backgroundColor: '#EEE'
  })
}));

const TimeSeriesStory = () => {
  const barHeight = 80;
  const classes = useStyles({ height: barHeight });
  const [resizeListener, { width, height }] = useResizeAware();
  const [generator] = useState(() => new Generator(100, 300));
  const [data, setData] = useState([]);

  useEffect(() => {
    generator.onUpdate(data => {
      setData([...data]);
    }).start();

    return () => { generator.stop(); };
  }, []);

  return (
    <div className={classes.root}>
      {resizeListener}
      <SVG width={width} height={height} center={false}>
        <TimeSeries data={data} width={width} height={barHeight} />
      </SVG>
    </div>
  );
};

export default TimeSeriesStory;
