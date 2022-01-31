//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';
import { css } from '@emotion/css';

import {
  FullScreen,
  Grid,
  SvgContainer,
  SvgContent,
  gridStyles,
  useGrid,
  useZoom,
  SvgContext
} from '../src';

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
  const context = useMemo(() => new SvgContext(), []);

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

// TODO(burdon): Hooks should rely on the React context.
export const WithHooks = () => {
  const context = useMemo(() => new SvgContext(), []);
  const gridRef = useGrid(context, { axis: true });
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

export const WithGrid = () => {
  return (
    <FullScreen>
      <SvgContainer className={styles}>
        <Grid axis />
      </SvgContainer>
    </FullScreen>
  );
};

export const WithZoom = () => {
  return (
    <FullScreen>
      <SvgContainer className={styles}>
        <Grid axis />
        <SvgContent
          zoom={[1/2, 4]}
          render={context => (
            <circle cx={0} cy={0} r={context.scale.model.toValue([2, 1])} />
          )}
        />
      </SvgContainer>
    </FullScreen>
  );
};
