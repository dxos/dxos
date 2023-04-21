//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type BarProps = {
  className?: string;
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
};

export const Bar = (props: BarProps) => {
  const { className, left, center, right } = props;
  return (
    <div className={mx('flex is-full justify-stretch items-center', className)}>
      <div className='basis-1/6'>{left}</div>
      <div className='basis-auto grow text-center'>{center}</div>
      <div className='basis-1/6 text-right'>{right}</div>
    </div>
  );
};
