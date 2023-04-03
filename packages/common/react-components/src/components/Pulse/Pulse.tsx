//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Size } from '../../props';
import { getSizeHeight } from '../../styles';
import { mx } from '../../util';

export type PulseProps = {
  className?: string;
  label?: string;
  size?: Size;
  pad?: number;
};

export const Pulse = (props: PulseProps) => {
  const { className, label, size } = { label: 'loading', size: 12, ...props } as Required<PulseProps>;
  const w = 60;
  const stroke = 2;
  const radius = 0;
  const duration = 3.5;
  const duty = 1;
  const circle = (delay = 0) => (
    <circle cx={w / 2} cy={w / 2} r={radius}>
      <animate
        attributeName='r'
        begin={delay / (duty * duration) + 's'}
        dur={duration + 's'}
        values={`0; ${w / 2}`}
        calcMode='spline'
        keyTimes='0; 1'
        keySplines='0.165, 0.84, 0.44, 1'
        repeatCount='indefinite'
      />
      <animate
        attributeName='opacity'
        begin={delay / (duty * duration) + 's'}
        dur={duration + 's'}
        values='1; 0'
        calcMode='spline'
        keyTimes='0; 1'
        keySplines='0.3, 0.61, 0.355, 1'
        repeatCount='indefinite'
      />
    </circle>
  );
  return (
    <div
      aria-label={label}
      role='status'
      aria-busy='true'
      className={mx('text-center stroke-neutral-400', size ? getSizeHeight(size) : '', className)}
    >
      <svg
        className='inline-block'
        height={'100%'}
        width={'100%'}
        viewBox={`0 0 ${w} ${w}`}
        xmlns='http://www.w3.org/2000/svg'
      >
        <g fill='none' fillRule='evenodd' strokeWidth={stroke}>
          {circle(0)}
          {circle(1)}
          {circle(2)}
        </g>
      </svg>
    </div>
  );
};
