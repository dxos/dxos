//
// Copyright 2018 DxOS
//

import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Chance } from 'chance';

import { Graph, GraphGenerator, GraphStyleBuidler } from '../src';

const chance = new Chance(0);

const styles = {
  root: {
    position: 'fixed',
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#EEE'
  },

  graph: GraphStyleBuidler.default
};

class NetworkGraphStory extends React.Component {

  static getDerivedStateFromProps(props) {
    const { running } = props;

    return {
      running
    };
  }

  _interval = null;

  _gemnerator = new GraphGenerator();

  state = {
    data: this._gemnerator.createTree(1).data,
    running: false
  };

  componentDidMount() {
    this._interval = setInterval(() => {
      const { running, data } = this.state;
      if (running) {
        const node = chance.pick(data.nodes);
        node.label = chance.word();
        this.setState({
          data
        });
      }
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
    this._interval = null;
  }

  render() {
    const { classes } = this.props;
    const { data } = this.state;

    return (
      <div className={classes.root}>
        <Graph
          ref={el => this._graph = el}
          className={classes.graph}
          data={data}
          draggable
        />
      </div>
    );
  }
}

export default withStyles(styles)(NetworkGraphStory);
