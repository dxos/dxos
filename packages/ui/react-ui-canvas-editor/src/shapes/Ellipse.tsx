//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ShapeComponentProps } from '../components/index.ts';
import { type EllipseShape } from '../types/index.ts';

export const EllipseComponent = ({ shape }: ShapeComponentProps<EllipseShape>) => {
  return (
    <svg className='dx-fill overflow-visible' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'>
      <circle cx={50} cy={50} r={50} className='stroke-current fill-none' />
    </svg>
  );
};
