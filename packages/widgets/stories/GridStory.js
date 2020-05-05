//
// Copyright 2018 DxOS
//

import { Chance } from 'chance';
import React from 'react';
import { withStyles } from '@material-ui/core/styles';

import { Grid } from '../src';

const chance = new Chance();

const rows = 8;
const grid = { x: 16, y: 16 };
const padding = { x: 2, y: 2 };

const styles = {
  root: {
    position: 'fixed',
    display: 'flex',
    left: 0,
    right: 0,
    top: 0,
    height: rows * (grid.y + padding.y) - padding.y,
    backgroundColor: '#EEE'
  },

  grid: {
    border: 10,

    '& rect': {
      'fill': 'steelblue',
      'stroke': 'steelblue'
    }
  }
};

class GridStory extends React.Component {

  render() {
    let { classes } = this.props;

    // TODO(burdon): Generate deps.
    const feeds = [...Array(rows).keys()]
      .map(feed => [...Array(chance.integer({ min: 0, max: 10 })).keys()]
        .map(i => ({ feed, i })));

    const layoutTime = (data = []) => {
      for (let t = 0; t < 80; t++) {
        feeds.forEach((feed, i) => {
          if (feed.length > t) {
            data.push({ x: t, y: i });
          }
        });
      }

      return data;
    };

    // TODO(burdon): Get layout from knobs.
    const data = layoutTime();

    return (
      <div className={classes.root}>
        <Grid className={classes.grid} grid={grid} padding={padding} data={data} />
      </div>
    );
  }
}

export default withStyles(styles)(GridStory);
