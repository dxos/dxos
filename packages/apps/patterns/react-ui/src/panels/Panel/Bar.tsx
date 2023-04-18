//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

export type BarProps = {
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
};

export const Bar = (props: BarProps) => {
  const { left, center, right } = props;
  return (
    <div className='flex is-full justify-stretch items-center'>
      <div className='basis-1/6'>{left}</div>
      <div className='basis-auto grow text-center'>{center}</div>
      <div className='basis-1/6 text-right'>{right}</div>
    </div>
  );
};
