//
// Copyright 2018 DxOS
//

import React from 'react';
import { withStyles } from '@material-ui/core/styles';

import { TimeSeries } from '../src';

const styles = () => ({
  root: {
    position: 'fixed',
    display: 'flex',
    left: 0,
    right: 0,
    top: 0,
    height: 100,
    backgroundColor: '#EEE'
  },

  timeseries: {
    '& g': {
      'fill': 'steelblue',
      'stroke': 'steelblue'
    }
  }
});

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

class TimeSeriesStory extends React.Component {

  state = {
    data: []
  };

  constructor() {
    super();

    this._generator = new Generator(100, 300).onUpdate(data => {
      this.setState({ data });
    }).start();
  }

  componentWillUnmount() {
    this._generator.stop();
  }

  render() {
    let { classes } = this.props;
    let { data=[] } = this.state;

    return (
      <div className={classes.root}>
        <TimeSeries className={classes.timeseries} data={data}/>
      </div>
    );
  }
}

export default withStyles(styles)(TimeSeriesStory);
