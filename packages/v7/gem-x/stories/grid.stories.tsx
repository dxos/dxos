//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { css } from '@emotion/css';

import {
  FullScreen,
  SvgContainer,
  useScale,
} from '../src';

export default {
  title: 'gem-x/Grid'
};

const styles = css`
  circle {
    stroke: seagreen;
    stroke-width: 2;
    fill: none;
  }
`;

export const Primary = () => {
  const scale = useScale({ gridSize: 32 });
  const r = scale.model.toValue(1);
  const [x, y] = scale.model.toPoint([-4, 2]);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        grid
        scale={scale}
        zoom={[1/4, 8]}
      >
        <g className={styles}>
          <circle cx={x} cy={y} r={r} />
          <text x={x} y={y} text-anchor='middle' dominant-baseline='middle'>TEST</text>
        </g>
      </SvgContainer>
    </FullScreen>
  );
}
