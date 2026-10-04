//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { keySymbols } from '@dxos/react-focus';

export const Key = ({ binding }: { binding: string }) => {
  return (
    <span role='term' className='inline-flex gap-1' aria-label={binding} id={binding}>
      {keySymbols(binding).map((c, i) => (
        <span key={i} className='flex size-6 justify-center items-center rounded-sm bg-input-surface text-fg'>
          {c}
        </span>
      ))}
    </span>
  );
};
