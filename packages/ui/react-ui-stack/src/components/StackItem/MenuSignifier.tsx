//
// Copyright 2024 DXOS.org
//

import React from 'react';

export const MenuSignifierHorizontal = () => (
  <svg
    className='absolute bottom-[7px]'
    width={20}
    height={2}
    viewBox='0 0 20 2'
    stroke='currentColor'
    opacity={0.5}
  >
    <line
      x1={0.5}
      y1={0.75}
      x2={19}
      y2={0.75}
      strokeWidth={1.25}
      strokeLinecap='round'
      strokeDasharray='6 20'
      strokeDashoffset='-6.5'
    />
  </svg>
);

export const MenuSignifierVertical = () => (
  <svg className='absolute left-1' width={2} height={18} viewBox='0 0 2 18' stroke='currentColor'>
    <line x1={1} y1={3} x2={1} y2={18} strokeWidth={1.5} strokeLinecap='round' strokeDasharray='0 6' />
  </svg>
);
