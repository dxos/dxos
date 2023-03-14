//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from 'phosphor-react';
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
  icon?: boolean;
};

export const Searchbar: FC<SearchbarProps> = ({ slots = {}, onSearch, icon }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
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
            onKeyDown: ({ key }) => key === 'Escape' && handleChange(''),
            spellCheck: false,
            ...slots.input
          }
        }}
        value={text}
        onChange={({ target }) => handleChange(target.value)}
      />

      {icon && (
        <button className={mx('p-1', slots.button?.className)} onClick={() => onSearch?.(text)}>
          <MagnifyingGlass />
        </button>
      )}
    </div>
  );
};
