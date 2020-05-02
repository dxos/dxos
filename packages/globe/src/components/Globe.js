//
// Copyright 2018 DxOS
//

import isEqual from 'lodash.isequal';
import PropTypes from 'prop-types';
import React from 'react';
import * as topojson from 'topojson';

// TODO(burdon): Replace with spore.
import { Container, bounds, resize } from '../../../widgets/src';

import { GlobeStyles } from '../style';
import { GeoUtil } from '../util';
import { Versor } from '../versor';
import { Model } from '../model';

const d3 = Object.assign({}, require('d3'), require('d3-inertia'));

/**
 * https://github.com/d3/d3-geo-projection
 */
export const GlobeProjections = {
  'Orthographic': () => d3.geoOrthographic(),
  'Mercator': () => d3.geoMercator(),
  'ConicConformal': () => d3.geoConicConformal(),
};

/**
 * Globe.
 *
 * Detailed documentation.
 * https://d3indepth.com/geographic
 */
// TODO(burdon): Convert to function.
export class Globe extends React.Component {

  static Projections = Object.keys(GlobeProjections);

  static propTypes = {
    className: PropTypes.string,
    projection: PropTypes.string,
    topology: PropTypes.object.isRequired,
    features: PropTypes.object,
    duration: PropTypes.number
  };

  static defaultProps = {
    model: new Model(),
    projection: Object.keys(GlobeProjections)[0],
    style: GlobeStyles[Object.keys(GlobeStyles)[0]],
    duration: 1250,
  };

  state = {};

  constructor(props) {
    super(props);

    const { model } = this.props;
    model.on('update', (state, now) => {
      const { offset, scale, rotation } = state;

      // TODO(burdon): Stop drag.
      if (now) {
        this.doTransitionNow();
      } else {
        this.doTransition(offset, scale, rotation);
      }
    });
  }

  get model() {
    return this.props.model;
  }

  /**
   * Create the projection and context now that the canvas element is available.
   */
  init() {
    const { projection, topology } = this.props;

    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    this._context = this._canvas.getContext('2d');

    // https://github.com/d3/d3-geo-projection (Extended).
    // https://github.com/d3/d3-geo/blob/master/README.md#projections
    this._projection = GlobeProjections[projection]();

    // https://github.com/d3/d3-geo#geoPath
    // https://github.com/d3/d3/blob/master/API.md#paths-d3-path
    this._path = d3.geoPath()
      .projection(this._projection)
      .context(this._context);

    // https://github.com/d3/d3-geo
    this._water = { type: 'Sphere' };

    // https://github.com/topojson/topojson
    this._land = topojson.feature(topology, topology.objects.land);

    // https://github.com/d3/d3-geo#geoGraticule
    this._graticule = d3.geoGraticule().step([10, 5])();

    // https://github.com/Fil/d3-inertia
    this._drag = d3.geoInertiaDrag(d3.select(this._canvas), () => {
      this.model.set({
        rotation: this._projection.rotate()
      });

      this.repaint();
    }, this._projection, { time: 1000 });

    this.doTransitionNow();
  }

  doTransition(offset, scale, rotation) {
    const { duration, onTransitionStart, onTransitionEnd } = this.props;
    if (!duration) {
      this.doTransitionNow();
    }

    const interpolateOffset = Versor.interpolatePoint(this.model.offset, offset);
    const interpolateScale = Versor.interpolateScalar(this.model.scale, scale);
    const interpolateRotation = Versor.interpolateAngles(this.model.rotation, rotation);

    // Stop the spinner immediately.
    onTransitionStart && onTransitionStart();

    // https://github.com/d3/d3-transition#selection_transition
    d3.select(this._canvas)
      .interrupt('t0')
      .transition('t0')
      .duration(duration)
      .tween('t1', () => t => {
        this.updateProjection(interpolateOffset(t), interpolateScale(t), interpolateRotation(t));
      })
      // https://github.com/d3/d3-transition#transition_on
      .on('end', () => {
        onTransitionEnd && onTransitionEnd();
      });
  }

  doTransitionNow() {
    d3.select(this._canvas)
      .interrupt('t0');

    this.updateProjection(this.model.offset, this.model.scale, this.model.rotation);
  }

  updateProjection(offset, scale, rotation) {
    const { width, height } = bounds(this._canvas);

    // https://github.com/d3/d3-geo#projections
    this._projection

      // Center of canvas.
      // https://github.com/d3/d3-geo#projection_translate
      .translate([width / 2 + offset.x, height / 2 + offset.y])

      // https://github.com/d3/d3-geo#projection_scale
      .scale(scale * (Math.min(width, height) / 2))

      // https://github.com/d3/d3-geo#projection_rotate
      .rotate(rotation);

    // Update current position.
    this.model.set({
      offset,
      scale,
      rotation
    });

    this.repaint();
  }

  repaint() {
    const { filter, style } = this.props;
    const { width, height } = bounds(this._canvas);

    // Clear background.
    if (style.background) {
      this._context.fillStyle = style.background;
      this._context.fillRect(0, 0, width, height);
    } else {
      this._context.clearRect(0, 0, width, height);
    }

    // Effects
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter
    if (filter) {
      this._context.filter = filter;
    }

    if (style.shadow) {
      this._context.filter = `drop-shadow(${style.shadow}px ${style.shadow}px 20px ${style.water})`;
    }

    // https://github.com/d3/d3-geo

    // Water
    if (style.water) {
      this._context.beginPath();
      this._path(this._water);
      this._context.fillStyle = style.water;
      this._context.fill();
    }

    if (style.shadow) {
      this._context.filter = `drop-shadow(1px 1px 1px #000`;
    }

    // Land
    if (style.land) {
      this._context.beginPath();
      this._path(this._land);
      this._context.fillStyle = style.land;
      this._context.fill();
    }

    this._context.filter = `drop-shadow()`;

    // Graticule
    if (style.graticule) {
      this._context.beginPath();
      this._path(this._graticule);
      this._context.lineWidth = 1;
      this._context.strokeStyle = style.graticule;
      this._context.stroke();
    }

    // Features
    const { features: { points = [], lines = [] } = {} } = this.props;

    // Arcs
    {
      // TODO(burdon): Animate arcs (transition outside of repaint).
      // https://observablehq.com/@mbostock/top-100-cities

      this._context.beginPath();
      this._path(GeoUtil.collection(lines.map(({ source, target }) => GeoUtil.line(source, target))));
      this._context.lineWidth = style.width || 1.5;
      this._context.strokeStyle = style.arc;

      style.dash && this._context.setLineDash(style.dash);

      this._context.stroke();
    }

    // Points
    {
      const size = .5;

      // TODO(burdon): Transition.
      this._context.beginPath();
      this._path(GeoUtil.collection(points.map(p => GeoUtil.circle(p, size))));
      this._context.fillStyle = style.place;
      this._context.fill();
    }
  };

  //
  // React lifecycle.
  //

  componentDidMount() {
    this.init();
  }

  componentDidUpdate(prevProps, prevState) {
    const diff = prop => !isEqual(this.props[prop], prevProps[prop]);
    if (diff('projection') || diff('style')) {
      this.init();
      return;
    }

    this.repaint();
  }

  render() {
    let { className } = this.props;

    const handler = (bounds) => {
      if (resize(this._canvas, bounds)) {
        this.doTransitionNow();
      }
    };

    return (
      <Container {...{ className }} onRender={handler}>
        <canvas ref={el => this._canvas = el} />
      </Container>
    );
  }
}
