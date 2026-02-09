//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { getSize, mx } from '@dxos/ui-theme';

export const Emoji = ({ text, className }: { text?: string; className?: string }) => {
  const size = 14;
  return (
    <div role='none' className={mx(getSize(size), 'rounded relative pointer-events-none', className)}>
      <svg viewBox={`0 0 ${size * 4} ${size * 4}`} width={size * 4} height={size * 4}>
        <text
          x='50%'
          y='50%'
          textAnchor='middle'
          dominantBaseline='middle'
          baselineShift={'-0.25rem'}
          fontSize={'2.25rem'}
        >
          {text}
        </text>
      </svg>
    </div>
  );
};

export const Centered = (props: PropsWithChildren) => {
  const { children } = props;
  return (
    <div role='none' className='absolute inset-0 flex items-center justify-center'>
      {children}
    </div>
  );
};
