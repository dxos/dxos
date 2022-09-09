//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState} from 'react';
import { css } from '@emotion/css';

import { Knobs, KnobsProvider, useButton } from '@dxos/esbuild-book-knobs';
import { FullScreen, Grid, Point, SVG, SVGContextProvider } from '@dxos/gem-core';

export default {
  title: 'experimental/shapes'
};

// TODO(burdon): Move to core or experimental.

faker.seed(Date.now());

const styles = css`
  background-color: #999;
  
  > div {
    align-items: center;
    justify-content: center;
  }

  svg {
    // width: 300px;
    // height: 150px;
    background-color: #fff;
  }

  g.shape {
    circle {
      stroke-width: 0px;
    }
    path {
      stroke: #333;
      stroke-width: 0px;
      opacity: 0.9;
    }
  }
`;

// https://v4.mui.com/customization/color/
const palette = {
  blue: [
    '#e3f2fd',
    '#bbdefb',
    '#90caf9',
    '#64b5f6',
    '#42a5f5',
    '#2196f3',
    '#1e88e5',
    '#1976d2',
    '#1565c0',
    '#0d47a1'
  ],
  teal: [
    '#e0f2f1',
    '#b2dfdb',
    '#80cbc4',
    '#4db6ac',
    '#26a69a',
    '#009688',
    '#00897b',
    '#00796b',
    '#00695c',
    '#004d40'
  ],
  orange: [
    '#fff3e0',
    '#ffe0b2',
    '#ffcc80',
    '#ffb74d',
    '#ffa726',
    '#ff9800',
    '#fb8c00',
    '#f57c00',
    '#ef6c00',
    '#e65100'
  ],
  grey: [
    '#fafafa',
    '#f5f5f5',
    '#eeeeee',
    '#e0e0e0',
    '#bdbdbd',
    '#9e9e9e',
    '#757575',
    '#616161',
    '#424242',
    '#212121'
  ]
};

type Data = {
  id: string
  color: string
  line: any
  points: Point[]
};

// https://github.com/d3/d3-shape/blob/v3.1.0/README.md#curveLinearClosed
const curves = [
  d3.curveCatmullRomClosed,
  d3.curveBasisClosed,
  d3.curveCardinalClosed,
  // d3.curveLinearClosed
];

const generate = ({
  numPoints = undefined
} = {}): Data[] => {
  const a = faker.datatype.number({ min: 3, max: 30 });
  const n = numPoints ?? faker.datatype.number({ min: 3, max: 7 });
  const r = 600;
  const aspect = 1.5;
  const dr = r / (n + 1);
  const gap = 10;
  const colors = palette[faker.random.arrayElement(Object.keys(palette))];
  const start = faker.datatype.number();
  const inverted = faker.datatype.boolean();

  const line = d3.line().curve(faker.random.arrayElement(curves));
  const center = [0, 0];
  return Array.from({ length: n }).map((_, i) => {
    const [cx, cy] = center;
    const bounds = { min: r - (i + 1) * dr + gap, max: r - i * dr };

    // TODO(burdon): Build up number of peaks.
    // TODO(burdon): Generate relative to previous point (more closely approximate contour).
    const points: Point[] = Array.from({ length: a }).map((_, i) => [
      cx + Math.sin(start + i * (Math.PI * 2 / a)) * faker.datatype.number(bounds),
      cy + Math.cos(start + i * (Math.PI * 2 / a)) * faker.datatype.number(bounds) / aspect,
    ]);

    return {
      id: `data-${i}`,
      color: inverted ? colors[colors.length - 1 - i % colors.length] : colors[i % colors.length],
      line,
      points
    }
  });
}

const path = path => path
  .style('fill', d => d.color)
  .attr('d', d => d.line(d.points));

const dot = circle => circle
  // .attr('fill', d => data.color)
  .attr('cx', d => d[0])
  .attr('cy', d => d[1])
  .attr('r', d => 2);

const Shape = ({ showDots = true }) => {
  const ref = useRef<SVGGElement>();
  const [data, setData] = useState<Data[]>(() => generate());

  // TODO(burdon): Need ref (useKnobValues)?
  // const numPoints = useNumber('Points', { min: 3, max: 20 }, 3);
  useButton('Reset', () => {
    setData(() => generate());
  });

  useEffect(() => {
    const duration = 500;
    const root = d3.select(ref.current);

    root
      .selectAll<SVGGElement, Data>('g')
      .data(data, (d: Data) => d.id)
      .join(
        enter => enter.append('g').attr('class', 'shape').call(group => {
          group
            .append('path')
            .call(path);

          showDots && group
            .selectAll('circle')
            .data(d => d.points)
            .join('circle')
            .call(dot);
        }),
        update => update.call(group => {
          group
            .select('path')
            .transition()
            .duration(duration)
            .call(path);

          showDots && group
            .selectAll('circle')
            .data(d => d.points)
            .join('circle')
            .transition()
            .duration(duration)
            .call(dot);
        }),
        exit => exit
          // .transition()
          // .duration(100)
          .remove()
      );
  }, [data]);

  return (
    <g ref={ref} />
  )
}

export const Primary = () => {
  const showGrid = false;

  return (
    <FullScreen className={styles}>
      <KnobsProvider>
        <SVGContextProvider>
          <SVG>
            {showGrid && (
              <Grid />
            )}
            <Shape />
          </SVG>
        </SVGContextProvider>
        <Knobs />
      </KnobsProvider>
    </FullScreen>
  );
};
