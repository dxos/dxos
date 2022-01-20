//
// Copyright 2018 DXOS.org
//

import times from 'lodash.times';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { makeStyles } from '@material-ui/core/styles';
import blueGrey from '@material-ui/core/colors/blueGrey';

import { SVG } from '@dxos/gem-core';

import Bar from './Bar';

export default {
  title: 'Bar',
  component: Bar
};

const useStyles = makeStyles(() => ({
  root: ({ width }: { width: number }) => ({
    display: 'flex',
    width,
    height: 80,
    backgroundColor: blueGrey[50],

    // TODO(burdon): Move to bar.
    '& rect': {
      stroke: 'none'
    },
    '& rect.value-0': {
      fill: blueGrey[400]
    },
    '& rect.value-1': {
      fill: blueGrey[800]
    }
  })
}));

const domain = [0, 100];
const rand = (min, max) => (max ? min : 0) + Math.floor(Math.random() * (max ? max - min : min));
const generate = () => times(5, id => ({ id, values: [ rand(50, 100), rand(0, 50) ] }));

export const Primary = () => {
  const max = 400;
  const delay = 3000;
  const classes = useStyles({ width: max });
  const [resizeListener, { width, height }] = useResizeAware();

  const [data, setData] = useState(generate);
  useEffect(() => {
    const interval = setInterval(() => {
      setData(generate());
    }, delay);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={classes.root}>
      {resizeListener}
      <SVG width={width} height={height} center={false}>
        <Bar data={data} domain={domain} delay={delay / 2} width={max} />
      </SVG>
    </div>
  );
};
