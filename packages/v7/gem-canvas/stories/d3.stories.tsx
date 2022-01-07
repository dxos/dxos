//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer } from '@dxos/gem-x';

export default {
  title: 'gem-canvas/D3'
};

const styles = css`
  circle {
    stroke: seagreen;
    stroke-width: 2;
    fill: #EEE;
    opacity: 0.4;
  }
`;

type Datum = { id: string }

export const Primary = () => {
  const groupRef = useRef<SVGSVGElement>();
  const [radius, setRadius] = useState(10);

  // Test join updates single item.
  // https://github.com/d3/d3-selection#selection_data
  // https://github.com/d3/d3-selection#selection_join

  const createCircle = el => el
    .selectAll('circle')
    .data([{ id: '_circle' }], (d: Datum) => d?.id) // Bound to __data__ property.
      .join('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius);

  useEffect(() => {
    d3.select(groupRef.current)
      .selectAll('g')
      .data([{ id: '_group' }], (d: Datum) => d?.id)
      .join('g') // TODO(burdon): Split enter/update/exit.
        .call(createCircle);
  }, [groupRef, radius]);

  useEffect(() => {
    const t = setTimeout(() => {
      setRadius(r => {
        return r + 100;
      });
    }, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <FullScreen>
      <SvgContainer className={styles}>
        <g />
        <g ref={groupRef} />
      </SvgContainer>
    </FullScreen>
  )
}
