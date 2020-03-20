//
// Copyright 2018 DxOS
//

import React from 'react';
import { boolean, number, select } from '@storybook/addon-knobs';
import { withStyles } from '@material-ui/core/styles';

import { Model, Globe, GeoUtil, GlobeStyles, Generator, Spinner } from '../src';

import TopologyData from '../data/110m.json';
import AirportsData from '../data/airports.json';
import CitiesData from '../data/cities.json';

import Trip from './data/trip.json';
import { Versor } from '../src/d3/globe/versor';

const CITY = 'New York';

const styles = {
  root: {
    display: 'flex',
    justifyContent: 'center',
    position: 'fixed',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  }
};

const generator = new Generator(CitiesData, {
  delay: 250
});

class GlobeStory extends React.Component {

  static get props() {
    return {
      running: boolean('generator', false),
      spinner: boolean('spinner', false),
      projection: select('projection', Globe.Projections),
      scale: number('scale', 180, { min: 10, max: 500 }),
      tilt: number('tilt', 25, { min: -45, max: 45 }),
      city: select('city', generator.cities, CITY),
      style: select('style', GlobeStyles),
      blur: number('blur', 0, { min: 0, max: 10 }),
      x: number('x', 0, { min: -500, max: 500 }),
      y: number('y', 500, { min: -500, max: 500 }),
    };
  }

  static getModelState(generator, props, prevProps = {}) {
    const state = {};

    const { scale } = props;
    if (scale !== prevProps.scale) {
      Object.assign(state, {
        scale: scale / 100
      });
    }

    // TODO(burdon): Changing tilt should use the current coordinates.
    const { city, tilt } = props;
    if (city !== prevProps.city || tilt !== prevProps.tilt) {
      const { lat = 0, lng = 0 } = generator.cityMap[city] || {};
      Object.assign(state, {
        rotation: Versor.coordinatesToAngles({ lat, lng }, tilt)
      });
    }

    const { x, y } = props;
    if (x !== prevProps.x || y !== prevProps.y) {
      Object.assign(state, {
        offset: { x, y }
      });
    }

    return state;
  }

  _model = new Model();

  _spinner = new Spinner(this._model, {
    rotation: [0.005, 0, 0],
    scale: 0.00000001
  });

  state = {};

  componentDidMount() {
    generator.on('update', (state) => {
      const { points, lines } = state;
      this.setState({
        features: {
          points,
          lines
        }
      })
    });

    if (this.props.spinner) {
      this._spinner.start();
    }

    if (this.props.running) {
      generator.start();
    }
  }

  componentWillUnmount() {
    this._spinner.stop();
    generator.stop();
  }

  componentDidUpdate(prevProps) {
    this._model.update(GlobeStory.getModelState(generator, this.props, prevProps));

    if (this.props.spinner !== prevProps.spinner) {
      if (this.props.spinner) {
        this._spinner.start();
      } else {
        this._spinner.stop();
      }
    }

    if (this.props.running !== prevProps.running) {
      if (this.props.running) {
        generator.start();
      } else {
        generator.stop();
      }
    }
  }

  render() {
    const { classes, blur, style, projection } = this.props;
    const { features } = this.state;

    if (!this._model.initialized) {
      this._model.set(GlobeStory.getModelState(generator, this.props));
    }

    return (
      <div className={classes.root}>
        <Globe
          style={style}
          model={this._model}
          onTransitionStart={() => this._spinner.stop()}
          onTransitionEnd={() => this._spinner.start()}
          projection={projection}
          topology={TopologyData}
          features={features}
          filter={blur && `blur(${blur}px)`}
          transition={1250}
        />
      </div>
    );
  }
}

export default withStyles(styles)(GlobeStory);
