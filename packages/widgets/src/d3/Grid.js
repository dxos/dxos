//
// Copyright 2019 DxOS.org
//

import * as d3 from 'd3';
import React, { Component } from 'react';

import { Container } from '../Container';

const t = (delay = 500) => d3.transition()
  .duration(delay)
  .ease(d3.easePoly);

/**
 * Grid renderer.
 */
export class Grid extends Component {

  handleResize = ({ width, height }) => {
    let { data, grid = { x: 16, y: 16 }, padding = { x: 2, y: 2 } } = this.props;

    d3.select(this._svg)
      .attr('width', width)
      .attr('height', height)
      .selectAll('rect')
      .data(data)
      .join('rect')
        .attr('id', ({ x, y }) => `${x}_${y}`)
        .attr('x', ({ x }) => (x * (grid.x + padding.x)) - width)
        .attr('y', ({ y }) => (y * (grid.y + padding.y)))
        .attr('width', grid.x - 1)
        .attr('height', grid.y - 1)
        .transition(t())
        .attr('x', ({ x }) => x * (grid.x + padding.x));
  };

  render() {
    const { className } = this.props;

    return (
      <Container {...{ className }} onRender={this.handleResize}>
        <svg ref={el => this._svg = el} />
      </Container>
    );
  }
}
