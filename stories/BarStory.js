//
// Copyright 2018 DxOS
//

import React from 'react';
import times from 'lodash.times';

import { withStyles } from '@material-ui/core/styles';

import { Bar } from '../src';

const styles = {
  root: {
    display: 'flex',
    width: 400,
    height: 80,
    backgroundColor: '#EEE',

    '& rect': {
      'fill': 'steelblue',
      'stroke': 'steelblue'
    },

    '& .value-0': {
      fill: '#666',
      strokeWidth: 0
    },
    '& .value-1': {
      fill: '#999',
      strokeWidth: 0
    }
  }
};

class BarStory extends React.Component {

  render() {
    let { classes } = this.props;

    const rand = (min, max) => (max ? min : 0) + Math.floor(Math.random() * (max ? max - min : min));

    const data = times(5, id => ({ id, values: [ rand(1, 20), rand(20, 100) ] }));

    return (
      <div className={classes.root}>
        <Bar data={data}/>
      </div>
    );
  }
}

export default withStyles(styles)(BarStory);
