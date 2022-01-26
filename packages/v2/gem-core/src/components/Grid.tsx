//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { ReactNode, useEffect, useRef } from 'react';

import { Scale, grid } from '../grid';

export interface GridProps {
  children?: ReactNode | ReactNode[]
  scale?: Scale
  visible?: boolean
  width?: number
  height?: number
}

export const Grid = ({ children, scale, visible = true, width = 0, height = 0 }: GridProps) => {
  const ref = useRef<SVGSVGElement>();
  useEffect(() => {
    if (visible) { // TODO(burdon): Remove node if false.
      d3.select(ref.current)
        .call(grid({ scale, width, height }));
    }
  }, [visible, width, height]);

  return (
    <g>
      <g ref={ref} className='grid' />
      {children}
    </g>
  );
}
