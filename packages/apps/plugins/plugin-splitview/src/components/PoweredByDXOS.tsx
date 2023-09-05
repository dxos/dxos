//
// Copyright 2023 DXOS.org
//

import React from 'react';

export type PoweredByDXOSProps = {};

export const PoweredByDXOS = (props: PoweredByDXOSProps) => {
  return (
    <span className='font-thin text-xs text-neutral-500'>
      Powered by{' '}
      <a
        href='https://dxos.org'
        rel='noreferrer'
        target='_blank'
        className='font-normal hover:text-neutral-700 hover:dark:text-neutral-200'
      >
        DXOS
      </a>
    </span>
  );
};
