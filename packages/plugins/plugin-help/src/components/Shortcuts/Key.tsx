//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { keySymbols } from '@dxos/keyboard';

import { shortcutKey } from './styles';

export const Key = ({ binding }: { binding: string }) => {
  return (
    <span role='term' className='w-flex gap-1' aria-label={binding} id={binding}>
      {keySymbols(binding).map((c, i) => (
        <span key={i} className={shortcutKey}>
          {c}
        </span>
      ))}
    </span>
  );
};
