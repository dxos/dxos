//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  root: {
    '& g': {
      'fill': 'steelblue',
      'stroke': 'steelblue'
    }
  }
}));

/**
 * Map time series to histogram.
 */
const processData = (data, points, period) => {

  // Quantize time.
  // TODO(burdon): Timezone?
  const t0 = Math.floor((Date.now() + period) / period) * period;
  const t1 = t0 - points * period;
  const x = d3.scaleTime()
    .domain([new Date(t1), new Date(t0)]);

  // Create histogram of time buckets.
  // TODO(burdon): To be renamed bins?
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
};

/**
 * Scrolling Time Series
 */
const TimeSeries = ({ data = [], domain = [0, 10], width, height, barWidth = 10, period = 500 }) => {
  const classes = useStyles();
  const group = useRef();

  // Update data reference.
  const dataRef = useRef();
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Start scroller.
  useEffect(() => {
    const startTime = Math.floor(Date.now() / period);

    // Interval adapts to be periodic based on load (i.e., catches up).
    const interval = d3.interval(() => {

      // TODO(burdon): Move to state/reference for performance.
      // Space for bar at either end.
      width += barWidth * 2;

      const x = d3.scaleLinear()
        .domain([Math.floor(width / barWidth), 0])
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain(domain)
        .range([0, height]);

      const bins = processData(dataRef.current, Math.floor(width / barWidth), period);
      const offsetTime = Math.floor(Date.now() / period) - startTime;

      d3.select(group.current)
        .selectAll('g[id=bar]')
          .selectAll('rect')
            .data(bins)

          .join('rect')
            .attr('x', (d, i) => x(i + offsetTime + 2))
            .attr('width', () => barWidth - 2)
            .attr('y', d => height - y(d.value))
            .attr('height', d => y(d.value))

          // Scroll.
          .transition()
            .duration(period)
            .ease(d3.easeLinear)
            .attr('transform', `translate(${barWidth * offsetTime})`);

    }, period);

    return () => clearInterval(interval);
  }, []);

  // Renderer is designed to be re-entrant (i.e., lazily create parent groups.)
  d3.select(group.current).selectAll('g')
    .data([{ id: 'bar' }])
    .join('g')
    .attr('id', d => d.id);

  return (
    <g ref={group} className={classes.root} />
  );
};

export default TimeSeries;
