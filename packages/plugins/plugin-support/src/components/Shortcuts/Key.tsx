//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { keySymbols } from '@dxos/keyboard';

export const Key = ({ binding }: { binding: string }) => {
  return (
    <span role='term' className='inline-flex gap-1' aria-label={binding} id={binding}>
      {keySymbols(binding).map((c, i) => (
        <span
          key={i}
          className='flex w-[24px] h-[24px] justify-center items-center rounded-sm bg-input-surface text-base-fg'
        >
          {c}
        </span>
      ))}
    </span>
  );
};
