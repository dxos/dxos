//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { HorizontalBarSeries, HorizontalGridLines, VerticalGridLines, XAxis, XYPlot, YAxis } from 'react-vis';

import { styles } from '../styles';

const feeds = [0, 1, 2, 3, 4];
const sequence = [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 1, 2, 2, 2, 2, 0, 3, 3, 2, 2, 1, 4, 4, 4, 4];

type Data = { current: [i: number, length: number] | undefined; stack: [number, number][] };

/**
 * Calculate spans.
 */
const segments = sequence.reduce<Data>(
  ({ current, stack }, i) => {
    if (!current || current[0] !== i) {
      current = [i, 1];
      stack.push(current);
    } else {
      current[1]++;
    }

    return { current, stack };
  },
  { current: undefined, stack: [] },
);

const data = segments.stack.flatMap(([i, length]) => {
  return [
    { color: 'darkred', values: feeds.map((f) => ({ y: f, x: f === i ? length : 0 })) }, // Current span.
    { color: 'white', values: feeds.map((f) => ({ y: f, x: f !== i ? length : 0 })) }, // Gap for others.
  ];
});

/**
 * https://uber.github.io/react-vis/examples/showcases/plots
 */
export const FeedGraph = () => {
  return (
    <div className={styles.bgPanel}>
      <XYPlot width={600} height={300} animation={false} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} stackBy='x'>
        <VerticalGridLines style={{ stroke: 'red' }} />
        <HorizontalGridLines style={{ stroke: 'green' }} />
        <XAxis />
        <YAxis />
        {data.map(({ values, color }, i) => (
          <HorizontalBarSeries key={i} barWidth={0.8} color={color} data={values} />
        ))}
      </XYPlot>
    </div>
  );
};
