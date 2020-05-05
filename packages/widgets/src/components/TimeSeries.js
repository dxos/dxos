//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { Container } from '@dxos/gem-core';

/**
 * Scrolling Time Series
 */
class TimeSeries extends Component {

  static propTypes = {
    period: PropTypes.number,
    barWidth: PropTypes.number,
    data: PropTypes.array,            // [{ ts:Date.now() }]
    domain: PropTypes.array           // [min, max]
  };

  static defaultProps = {
    period: 500,
    barWidth: 10,
    data: [],
    domain: [0, 10]
  };

  componentDidMount() {
    let { period } = this.props;

    const startTime = Math.floor(Date.now() / period);

    // Start scroller.
    // Interval adapts to be periodic based on load (i.e., catches up).
    this._interval = d3.interval(() => {
      let { domain, barWidth, data } = this.props;

      if (this._bar) {
        let { width, height } = this._bounds;

        // Space for bar at either end.
        width += 2 * barWidth;

        const x = d3.scaleLinear()
          .domain([Math.floor(width / barWidth), 0])
          .range([0, width]);

        const y = d3.scaleLinear()
          .domain(domain)
          .range([0, height]);

        const points = Math.floor(width / barWidth);
        const bins = this._processData(data, points, period);

        const offsetTime = Math.floor(Date.now() / period) - startTime;

        this._bar
          .selectAll('rect')
          .data(bins)
          .join('rect')
          .attr('x', (d, i) => x(i + offsetTime + 2))
          .attr('width', () => barWidth - 2)
          .attr('y', d => height - y(d.value))
          .attr('height', d => y(d.value));

        this._bar
          .transition()
          .duration(period)
          .ease(d3.easeLinear)
          .attr('transform', `translate(${barWidth * offsetTime})`);
      }
    }, period);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  handleResize = ({ width, height }) => {

    // TODO(burdon): Get from component?
    this._bounds = { width, height };

    const root = d3.select(this._svg)
      .attr('width', width)
      .attr('height', height);

    // Renderer is designed to be re-entrant (i.e., lazily create parent groups.)
    root.selectAll('g')
      .data([
        { id: 'bar' },
      ])
      .join('g')
      .attr('id', d => d.id);

    this._bar = root
      .selectAll('g[id=bar]');
  };

  /**
   * Map time series to histogram.
   */
  _processData(data, points, period) {

    // TODO(burdon): Timezone?

    // Quantize time.
    const t0 = Math.floor((Date.now() + period) / period) * period;
    const t1 = t0 - points * period;
    const x = d3.scaleTime()
      .domain([new Date(t1), new Date(t0)]);

    // Create histogram of time buckets.
    // TODO(burdon): To be renamed bins()
    const bins = d3.histogram()
      .domain(x.domain())
      .thresholds(x.ticks(points))
      .value((d, i, data) => data[i].ts)(data);

    return bins.map(d => {
      return {
        id: d.x0.getTime(),
        value: d.length
      };
    });
  }

  render() {
    let { className } = this.props;

    return (
      <Container {...{ className }} onRender={this.handleResize}>
        <svg ref={el => this._svg = el} />
      </Container>
    );
  }
}

export default TimeSeries;

