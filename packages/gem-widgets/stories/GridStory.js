//
// Copyright 2018 DxOS
//

import { Chance } from 'chance';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { makeStyles } from '@material-ui/core/styles';

import { SVG } from '@dxos/gem-core';

// TODO(burdon): Rename.
import { Grid } from '../src';

const chance = new Chance();

const rows = 8;
const grid = { x: 16, y: 16 };
const padding = { x: 2, y: 2 };

const useStyles = makeStyles(() => ({
  root: {
    position: 'fixed',
    display: 'flex',
    left: 0,
    right: 0,
    top: 0,
    height: rows * (grid.y + padding.y) - padding.y,
    backgroundColor: '#EEE',
    padding: 8
  }
}));

const generate = (data = []) => {
  const feeds = [...Array(rows).keys()]
    .map(feed => [...Array(chance.integer({ min: 0, max: 10 })).keys()]
      .map(i => ({ feed, i })));

  for (let t = 0; t < 80; t++) {
    feeds.forEach((feed, i) => {
      if (feed.length > t) {
        data.push({ x: t, y: i });
      }
    });
  }

  return data;
};

const GridStory = () => {
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();
  const delay = 2000;

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
        <Grid className={classes.grid} delay={delay / 4} data={data} grid={grid} padding={padding} />
      </SVG>
    </div>
  );
};

export default GridStory;
