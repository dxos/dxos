//
// Copyright 2018 DxOS
//

import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { number } from '@storybook/addon-knobs';

import { Graph, GraphGenerator, GraphStyleBuidler, Physics, pulse } from '../src';

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

class GraphStory extends React.Component {

  static get props() {
    return {

      // TODO(burdon): Doesn't seem to update simulation.
      physics: () => {
        return new Physics({
          link: {
            distance: number('link:distance', 50, { min: 0, max: 200 })
          },
          charge: {
            strength: number('charge:strength', -100, { min: -500, max: 0 })
          }
        });
      }
    }
  }

  static getDerivedStateFromProps(props, state) {
    const { running } = props;

    return {
      running
    };
  }

  _interval = null;

  _generator = new GraphGenerator();

  state = {
    data: this._generator.createTree(2).data,
    running: false
  };

  componentDidMount() {
    this._interval = setInterval(() => {
      const { running } = this.state;
      if (running) {

        // Create
        if (Math.random() > .4) {
          this._generator.createNodes().createLinks(1);
        }

        // Link
        if (Math.random() > .3) {
          this._generator.createLinks(1);
        }

        // Delete
        if (Math.random() > .8) {
          this._generator.deleteNodes(this._generator.pickNodes(1).map(node => node.id))
        }

        // Pulse
        if (Math.random() > .4) {
          let nodes = this._generator.pickNodes();
          if (nodes.length) {
            pulse(this._graph, nodes[0].id);
          }
        }

        this.setState({
          data: this._generator.data
        });
      }
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
    this._interval = null;
  }

  render() {
    const { classes, physics } = this.props;
    const { data } = this.state;

    const handleCreate = (id, pos) => {
      let node = Object.assign(this._generator.createNode(), pos);
      this.setState({
        data: this._generator.createLink(id, node.id).data
      });
    };

    const handleLink = (source, target) => {
      this.setState({
        data: this._generator.createLink(source, target).data
      });
    };

    const handleDelete = (id) => {
      this.setState({
        data: this._generator.deleteNodes([id]).data
      });
    };

    const handleSelect = (id) => {
      pulse(this._graph, id);
    };

    return (
      <div className={classes.root}>
        <Graph
          ref={el => this._graph = el}
          className={classes.graph}
          physics={physics()}
          data={data}
          draggable
          onCreate={handleCreate}
          onDelete={handleDelete}
          onSelect={handleSelect}
          onLink={handleLink}
        />
      </div>
    );
  }
}

export default withStyles(styles)(GraphStory);
