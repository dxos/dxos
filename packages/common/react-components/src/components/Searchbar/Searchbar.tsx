//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { mx } from '../../util';
import { Input } from '../Input';

type SearchbarSlots = {
  root?: {
    className?: string;
  };
  input?: {
    className?: string;
    autoFocus?: boolean;
  };
  button?: {
    className?: string;
  };
};

export type SearchbarProps = {
  slots?: SearchbarSlots;
  onSearch?: (text: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ slots = {}, onSearch }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };

  const handleReset = () => {
    handleChange('');
  };

  return (
    <div className={mx('flex w-full items-center', slots.root?.className)}>
      <Input
        variant='subdued'
        label='Search'
        labelVisuallyHidden
        placeholder='Search...'
        slots={{
          root: {
            className: 'w-full'
          },
          input: {
            onKeyDown: ({ key }) => key === 'Escape' && handleReset(),
            spellCheck: false,
            ...slots.input
          }
        }}
        value={text}
        onChange={({ target }) => handleChange(target.value)}
      />

      <button className={mx('p-1', slots.button?.className)} onClick={handleReset}>
        <X />
      </button>
    </div>
  );
};
