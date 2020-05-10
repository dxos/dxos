//
// Copyright 2018 DxOS
//

const d3 = Object.assign({}, require('d3'), require('d3-inertia'));
import * as topojson from 'topojson';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';

//
// Utils.
//

const renderFeatures = (geoPath, features) => {
  const context = geoPath.context();
  const { canvas: { width, height } } = context;

  // Clear background.
  context.clearRect(0, 0, width, height);

  // Render features.
  // https://github.com/d3/d3-geo#_path
  features.forEach(({ path, styles = {} }) => {
    let doFill = false;
    let doStroke = false;

    Object.keys(styles).forEach(key => {
      const value = styles[key];
      context[key] = value;
      doFill = (doFill || key === 'fillStyle' && value);
      doStroke = (doStroke || key === 'strokeStyle' && value);
    });

    context.beginPath();
    geoPath(path);

    if (doFill) {
      context.fill();
    }

    if (doStroke) {
      context.stroke();
    }
  });
};

const defaultStyles = {
  water: {
    fillStyle: '#000020'
  },

  land: {
    fillStyle: '#354D37'
  }
};

const useStyles = makeStyles(() => ({
  root: {
    backgroundColor: '#000'
  }
}));

/**
 * Basic globe renderer.
 *
 * @param props
 * @param props.topology
 * @param props.projection
 * @param props.styles
 * @param props.offset
 * @param props.rotation
 * @param props.scale
 * @param props.drag
 */
const Globe2 = (props) => {
  const {
    topology,
    projection = d3.geoOrthographic(),
    styles=defaultStyles,
    offset = { x: 0, y: 0 },
    rotation = [0, 0, 0],
    scale = 0.9,
    drag = false
  } = props;

  const features = [
    {
      path: { type: 'Sphere' },
      styles: styles.water
    },
    {
      path: topojson.feature(topology, topology.objects.land),
      styles: styles.land
    }
  ];

  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();
  const canvas = useRef();
  const geoPath = useRef();

  //
  // Init.
  //

  useEffect(() => {
    // https://github.com/d3/d3-geo#geoPath
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    geoPath.current = d3.geoPath()
      .context(canvas.current.getContext('2d'))
      .projection(projection);

    // https://github.com/Fil/d3-inertia
    if (drag) {
      d3.geoInertiaDrag(d3.select(canvas.current), () => {
        renderFeatures(geoPath.current, features);
      }, projection, { time: 3000 });
    }
  }, [projection, drag]);

  //
  // Update projection and render.
  //

  useEffect(() => {

    //
    // Update projection.
    //

    {
      const center = {
        x: offset.x + width / 2,
        y: offset.y + height / 2
      };

      projection
        // https://github.com/d3/d3-geo#projection_translate
        .translate([ center.x, center.y ])

        // https://github.com/d3/d3-geo#projection_scale
        .scale((Math.min(width, height) / 2) * scale)

        // https://github.com/d3/d3-geo#projection_rotate
        .rotate(rotation);
    }

    //
    // Features.
    //

    renderFeatures(geoPath.current, features);

  }, [geoPath, rotation, scale, width, height]);

  return (
    <div className={classes.root}>
      {resizeListener}
      <canvas width={width} height={height} ref={canvas}/>
    </div>
  );
};

export default Globe2;
