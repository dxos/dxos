//
// Copyright 2018 DxOS
//

import React from 'react';
import { withStyles } from '@material-ui/core/styles';

import { Orbit, GraphGenerator, GraphStyleBuidler } from '../src';

const styles = {
  root: {
    position: 'fixed',
    display: 'flex',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#EEE'
  },

  orbit: GraphStyleBuidler.default
};

const data = new GraphGenerator().createTree(4).data;

class OrbitStory extends React.Component {

  render() {
    let { classes } = this.props;

    data.root = data.nodes[0].id;

    return (
      <div className={classes.root}>
        <Orbit className={classes.orbit} data={data} />
      </div>
    );
  }
}

export default withStyles(styles)(OrbitStory);
