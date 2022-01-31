//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer, gridStyles, useContext, useGrid, useZoom } from '../src';

export default {
  title: 'gem-x/SvgContainer'
};

const styles = css`
  circle {
    stroke: #999;
    stroke-width: 4px;
    fill: none;
  }
`;

export const Primary = () => {
  const context = useContext();

  return (
    <FullScreen>
      <SvgContainer>
        <g className={styles}>
          <circle cx={0} cy={0} r={context.scale.model.toValue([2, 1])} />
        </g>
      </SvgContainer>
    </FullScreen>
  );
};

export const Secondary = () => {
  const context = useContext();
  const gridRef = useGrid(context, { axis: false });
  const zoomRef = useZoom(context);

  return (
    <FullScreen>
      <SvgContainer context={context}>
        <g ref={gridRef} className={gridStyles} />
        <g ref={zoomRef} className={styles}>
          <circle cx={0} cy={0} r={context.scale.model.toValue([2, 1])} />
        </g>
      </SvgContainer>
    </FullScreen>
  );
};
