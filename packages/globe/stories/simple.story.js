//
// Copyright 2018 DxOS
//

import React, { useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';
import { withKnobs } from "@storybook/addon-knobs";

import TopologyData from '../data/110m.json';

import { Globe } from '../src';

export default {
  title: 'Simple',
  decorators: [withKnobs]
};

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    width: 800,
    height: 400
  }
}));

export const withSimpleGlobe = () => {
  const canvas = useRef();
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();

  return (
    <div className={classes.root}>
      {resizeListener}
      <Globe
        ref={canvas}
        drag={true}
        topology={TopologyData}
        offset={{ x: 0, y: 200 }}
        scale={1.8}
        width={width}
        height={height}
      />
    </div>
  );
};
