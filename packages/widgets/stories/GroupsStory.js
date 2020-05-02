//
// Copyright 2019 DxOS.org
//

import React, { Component } from 'react';

import { withStyles } from '@material-ui/core/styles';

import { Container, NodeGroup, LinkGroup, resize } from '../src';

import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';

const styles = {
  root: {
    position: 'fixed',
    display: 'flex',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#EEE',

    '& circle': {
      'stroke': blue[900],
      'strokeWidth': 3,
      'fill': blue[200]
    },

    '& path': {
      'stroke': grey[400],
      'strokeWidth': .5,
    }
  }
};

const delay = 500;

/**
 * Container
 */
export class Test extends Component {

  // TODO(burdon): Use generator.
  data = {

    nodes: [
      { id: 'i-1' },
      { id: 'i-2' },
      { id: 'i-3' },
      { id: 'i-4' },
      { id: 'i-5' },
    ],

    links: [
      { id: 'x-1', source: 'i-1', target: 'i-2' },
      { id: 'x-2', source: 'i-2', target: 'i-3' },
      { id: 'x-3', source: 'i-3', target: 'i-4' },
      { id: 'x-4', source: 'i-4', target: 'i-5' },
      { id: 'x-5', source: 'i-5', target: 'i-1' },
    ],
  };

  doLayout = (bounds) => {
    resize(this._svg, bounds);

    // Create positions in data.
    const { width, height } = bounds;

    const nodes = new NodeGroup(this._nodes);
    const links = new LinkGroup(this._links);

    const random = n => Math.random() * n - n / 2;

    const layout = (data) => {
      data.nodes.forEach(node => {
        const { point: { x = 0, y = 0 } = {} } = node;

        node.point = {
          x: x + random(.1 * width),
          y: y + random(.1 * height)
        };
      });

      nodes.data(data.nodes, { bounds, data });
      links.data(data.links, { bounds, data });
    };

    layout(this.data);

    clearInterval(this._interval);
    const { running } = this.props;
    if (running) {
      this._interval = setInterval(() => layout(this.data), delay);
    }
  };

  render() {
    const { classes={} } = this.props;

    return (
      <Container onRender={this.doLayout}>
        <svg ref={el => this._svg = el} className={classes.root}>
          <g ref={el => this._links = el}/>
          <g ref={el => this._nodes = el}/>
        </svg>
      </Container>
    );
  }
}

class GroupsStory extends React.Component {

  static getDerivedStateFromProps(props, state) {
    const { running } = props;

    return {
      running
    };
  }

  state = {};

  render() {
    let { classes } = this.props;
    let { running } = this.state;

    return (
      <div className={classes.root}>
        <Test running={running}/>
      </div>
    );
  }
}

export default withStyles(styles)(GroupsStory);
