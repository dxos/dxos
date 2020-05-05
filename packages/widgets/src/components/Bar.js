//
// Copyright 2019 DxOS.org
//

import * as d3 from 'd3';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { Container } from '@dxos/gem-core';

/**
 * Grid renderer.
 */
class Bar extends Component {

  // TODO(burdon): Vertical/horizontal.

  static propTypes = {
    barHeight: PropTypes.number,
    domain: PropTypes.array
  };

  static defaultProps = {
    barHeight: 16,
    domain: [0, 100]
  };

  handleResize = ({ width, height }) => {
    let { data, barHeight, domain } = this.props;

    const x = d3.scaleLinear()
      .domain(domain)
      .range([0, width]);

    let i = 0;
    let rects = [];
    data.forEach(({ values }) => {
      if (values) {
        let prev = 0;
        rects = rects.concat(values.map((value, n) => {
          let rect = {
            n,
            x: x(prev),
            y: i * barHeight + 1,
            width: x(value - prev),
            height: barHeight - 2
          };

          prev = value;

          return rect;
        }));
      }

      i++;
    });

    d3.select(this._svg)
      .attr('width', width)
      .attr('height', height)
      .selectAll('rect')
        .data(rects)
        .join('rect')
        .attr('id', d => d.id)
        .attr('class', ({ n }) => `value-${n}`)
        .attr('x', ({ x }) => x)
        .attr('y', ({ y }) => y)
        .attr('width', ({ width }) => width)
        .attr('height', ({ height }) => height);
  };

  render() {
    return (
      <Container onRender={this.handleResize}>
        <svg ref={el => this._svg = el}/>
      </Container>
    );
  }
}

export default Bar;
