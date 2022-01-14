//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';

import { FractionUtil, FullScreen, Scale, SvgContainer, Vector } from '../src';

export default {
  title: 'gem-x/Grid'
};

const styles = css`
  circle {
    stroke: seagreen;
    stroke-width: 2;
    fill: none;
  }
  text {
    font-family: sans-serif;
  }  
`;

export const Primary = () => {
  const scale = useMemo(() => new Scale(32), []);
  const [{ r, x, y }, setData] = useState({ r: 0, x: 0, y: 0 });

  useEffect(() => {
    setTimeout(() => {
      const [r] = scale.model.toValues([FractionUtil.toFraction(1)]);
      const [x, y] = scale.model.toPoint(Vector.toVertex({ x: -4, y: 2 }));
      setData({ r, x, y });
    }, 1000);
  }, []);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        grid
        scale={scale}
        zoom={[1/4, 8]}
      >
        {r && (
          <g className={styles}>
            <circle cx={x} cy={y} r={r} />
            <text x={x} y={y} textAnchor='middle' dominantBaseline='middle'>Zoom</text>
          </g>
        )}
      </SvgContainer>
    </FullScreen>
  );
}
